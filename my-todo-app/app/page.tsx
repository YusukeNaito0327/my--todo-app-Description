'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from '@/lib/supabase/client';

interface Task {
  id: number;
  text: string;
  completed: boolean;
  userId: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Comment {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: Date;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newTask, setNewTask] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number>(1);
  const [newComments, setNewComments] = useState<{[taskId: number]: string}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const supabase = createClient();

  // Supabaseからデータを読み込み
  useEffect(() => {
    if (!initialized) {
      loadData();
    }
  }, [initialized]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // まずローカルストレージからCurrentUserを復元
      const savedCurrentUser = localStorage.getItem('currentUser');
      let restoredUser = null;
      if (savedCurrentUser) {
        try {
          restoredUser = JSON.parse(savedCurrentUser);
          console.log('ローカルストレージからユーザー情報を復元:', restoredUser);
        } catch (e) {
          console.error('ローカルストレージからのユーザー情報の復元に失敗:', e);
        }
      } else {
        console.log('ローカルストレージにユーザー情報が保存されていません');
      }

      // ユーザー一覧を取得
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('id');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // 復元したユーザーがデータベースに存在するかチェック
      if (restoredUser) {
        const existingUser = usersData?.find(u => u.id === restoredUser.id);
        if (existingUser) {
          console.log('ユーザー情報を設定:', existingUser);
          setCurrentUser(existingUser);
        } else {
          console.log('復元したユーザーがデータベースに存在しません:', restoredUser);
          // ユーザーがデータベースに存在しない場合、ローカルストレージをクリア
          localStorage.removeItem('currentUser');
        }
      }

      // タスク一覧を取得（データベースカラム名に合わせて調整）
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at');

      if (tasksError) throw tasksError;
      
      // Supabaseのカラム名をアプリの型に変換
      const tasksWithCorrectFields = (tasksData || []).map(task => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        userId: task.user_id
      }));
      console.log(`${tasksWithCorrectFields.length}件のタスクを読み込みました`);
      setTasks(tasksWithCorrectFields);

      // コメント一覧を取得
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .order('created_at');

      if (commentsError) throw commentsError;
      
      // Supabaseのカラム名をアプリの型に変換
      const commentsWithCorrectFields = (commentsData || []).map(comment => ({
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        userName: comment.user_name,
        content: comment.content,
        createdAt: new Date(comment.created_at)
      }));
      console.log(`${commentsWithCorrectFields.length}件のコメントを読み込みました`);
      setComments(commentsWithCorrectFields);

    } catch (error: any) {
      console.error('データの読み込みに失敗しました:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // currentUserをローカルストレージに保存
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const addTask = async () => {
    if (newTask.trim() !== '' && currentUser) {
      try {
        setError(null);
        const { data, error } = await supabase
          .from('tasks')
          .insert([
            {
              text: newTask.trim(),
              completed: false,
              user_id: currentUser.id
            }
          ])
          .select()
          .single();

        if (error) throw error;

        const newTaskData: Task = {
          id: data.id,
          text: data.text,
          completed: data.completed,
          userId: data.user_id
        };
        
        setTasks([...tasks, newTaskData]);
        setNewTask('');
      } catch (error: any) {
        console.error('タスクの追加に失敗しました:', error);
        setError(error.message);
      }
    }
  };

  const login = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      console.log('ユーザーがログインしました:', user);
      setCurrentUser(user);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const registerUser = async () => {
    if (newUserName.trim() !== '' && newUserEmail.trim() !== '') {
      try {
        setError(null);
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              name: newUserName.trim(),
              email: newUserEmail.trim()
            }
          ])
          .select()
          .single();

        if (error) throw error;

        const newUser = data as User;
        setUsers([...users, newUser]);
        setCurrentUser(newUser);
        setNewUserName('');
        setNewUserEmail('');
        setShowRegistration(false);
      } catch (error: any) {
        console.error('ユーザー登録に失敗しました:', error);
        setError(error.message);
      }
    }
  };

  const addComment = async (taskId: number) => {
    const commentText = newComments[taskId];
    if (commentText && commentText.trim() !== '' && currentUser) {
      try {
        setError(null);
        const { data, error } = await supabase
          .from('comments')
          .insert([
            {
              task_id: taskId,
              user_id: currentUser.id,
              user_name: currentUser.name,
              content: commentText.trim()
            }
          ])
          .select()
          .single();

        if (error) throw error;

        const newComment: Comment = {
          id: data.id,
          taskId: data.task_id,
          userId: data.user_id,
          userName: data.user_name,
          content: data.content,
          createdAt: new Date(data.created_at)
        };

        setComments([...comments, newComment]);
        setNewComments(prev => ({ ...prev, [taskId]: '' }));
      } catch (error: any) {
        console.error('コメントの追加に失敗しました:', error);
        setError(error.message);
      }
    }
  };

  const getTaskComments = (taskId: number): Comment[] => {
    return comments.filter(comment => comment.taskId === taskId);
  };

  const toggleTask = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      ));
    } catch (error: any) {
      console.error('タスクの更新に失敗しました:', error);
      setError(error.message);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== id));
      // 関連するコメントも削除（Supabaseの外部キー制約で自動削除される）
      setComments(comments.filter(comment => comment.taskId !== id));
    } catch (error: any) {
      console.error('タスクの削除に失敗しました:', error);
      setError(error.message);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, completed: boolean) => {
    e.preventDefault();
    if (draggedTask) {
      try {
        setError(null);
        const { error } = await supabase
          .from('tasks')
          .update({ completed })
          .eq('id', draggedTask.id);

        if (error) throw error;

        setTasks(tasks.map(task => 
          task.id === draggedTask.id 
            ? { ...task, completed } 
            : task
        ));
        setDraggedTask(null);
      } catch (error: any) {
        console.error('タスクの更新に失敗しました:', error);
        setError(error.message);
        setDraggedTask(null);
      }
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  // 現在のユーザーのタスクのみフィルタリング
  const userTasks = currentUser ? tasks.filter(task => task.userId === currentUser.id) : [];
  const uncompletedTasks = userTasks.filter(task => !task.completed);
  const completedTasks = userTasks.filter(task => task.completed);

  // ローディング中の表示
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    );
  }

  // ログインしていない場合のログイン画面
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-8">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Todoアプリ</h1>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {showRegistration ? (
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-6">新規登録</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">名前</label>
                    <Input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="田中太郎"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                    <Input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="tanaka@example.com"
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={registerUser} className="flex-1 bg-green-600 hover:bg-green-700">
                      登録
                    </Button>
                    <Button 
                      onClick={() => setShowRegistration(false)} 
                      variant="outline" 
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-6">ログイン</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ユーザーを選択</label>
                    <select 
                      value={selectedUserId} 
                      onChange={(e) => setSelectedUserId(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => login(selectedUserId)} className="w-full bg-blue-600 hover:bg-blue-700">
                    ログイン
                  </Button>
                  <div className="text-center">
                    <button 
                      onClick={() => setShowRegistration(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm underline"
                    >
                      新規登録はこちら
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ログイン後のメイン画面
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* ヘッダー部分 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">カンバンボード</h1>
              <p className="text-lg text-gray-600 mt-2">ようこそ、{currentUser.name}さん</p>
            </div>
            <Button 
              onClick={logout} 
              variant="outline" 
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
            >
              ログアウト
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 max-w-lg mx-auto">
              {error}
            </div>
          )}
          
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="新しいタスクを入力してください..."
                className="flex-1"
              />
              <Button onClick={addTask} className="px-6 bg-blue-600 hover:bg-blue-700">
                追加
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 未完了カラム */}
          <div 
            className="bg-white rounded-xl shadow-lg p-6 min-h-96"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, false)}
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200">
              📝 未完了 ({uncompletedTasks.length})
            </h2>
            <div className="space-y-3">
              {uncompletedTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8 italic">タスクがありません</p>
              ) : (
                uncompletedTasks.map((task) => {
                  const taskComments = getTaskComments(task.id);
                  return (
                    <div
                      key={task.id}
                      className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      {/* タスク情報 */}
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        className="flex items-center gap-3 cursor-move mb-3"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="flex-shrink-0"
                        />
                        <span className="flex-1 text-gray-700 font-medium">
                          {task.text}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 flex items-center justify-center text-sm font-bold transition-all"
                          title="タスクを削除"
                        >
                          ×
                        </button>
                      </div>

                      {/* コメント一覧 */}
                      <div className="space-y-2 mb-3">
                        {taskComments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">コメントはありません</p>
                        ) : (
                          taskComments.map((comment) => (
                            <div key={comment.id} className="bg-white bg-opacity-60 rounded p-2 text-xs">
                              <div className="font-semibold text-gray-600">{comment.userName}</div>
                              <div className="text-gray-700 mt-1">{comment.content}</div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* コメント入力欄 */}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newComments[task.id] || ''}
                          onChange={(e) => setNewComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                          placeholder="コメントを追加..."
                          className="flex-1 h-8 text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addComment(task.id);
                            }
                          }}
                        />
                        <Button
                          onClick={() => addComment(task.id)}
                          size="sm"
                          className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          追加
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 完了済みカラム */}
          <div 
            className="bg-white rounded-xl shadow-lg p-6 min-h-96"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, true)}
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-green-200">
              ✅ 完了済み ({completedTasks.length})
            </h2>
            <div className="space-y-3">
              {completedTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8 italic">完了したタスクがありません</p>
              ) : (
                completedTasks.map((task) => {
                  const taskComments = getTaskComments(task.id);
                  return (
                    <div
                      key={task.id}
                      className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      {/* タスク情報 */}
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        className="flex items-center gap-3 cursor-move mb-3"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="flex-shrink-0"
                        />
                        <span className="flex-1 text-gray-600 line-through font-medium">
                          {task.text}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 flex items-center justify-center text-sm font-bold transition-all"
                          title="タスクを削除"
                        >
                          ×
                        </button>
                      </div>

                      {/* コメント一覧 */}
                      <div className="space-y-2 mb-3">
                        {taskComments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">コメントはありません</p>
                        ) : (
                          taskComments.map((comment) => (
                            <div key={comment.id} className="bg-white bg-opacity-60 rounded p-2 text-xs">
                              <div className="font-semibold text-gray-600">{comment.userName}</div>
                              <div className="text-gray-700 mt-1">{comment.content}</div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* コメント入力欄 */}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newComments[task.id] || ''}
                          onChange={(e) => setNewComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                          placeholder="コメントを追加..."
                          className="flex-1 h-8 text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addComment(task.id);
                            }
                          }}
                        />
                        <Button
                          onClick={() => addComment(task.id)}
                          size="sm"
                          className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                        >
                          追加
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
