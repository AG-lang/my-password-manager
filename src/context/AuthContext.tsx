// src/context/AuthContext.tsx
"use client"; 

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // 我们将更有效地使用这个 loading 状态
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, loading };
  
  // 关键修复：如果正在加载，则显示一个全屏的加载指示器，
  // 并且不渲染任何子组件 (children)。
  // 这可以保证在 Firebase 状态确定之前，服务器和客户端都渲染相同的内容。
  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
            <p>Loading Your Secure Session...</p>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};