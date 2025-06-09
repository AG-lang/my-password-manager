// src/app/login/page.tsx
"use client";

import { useState, FormEvent } from 'react';
import { auth } from '../../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (err) { // 修复: 不再使用 any
        // 修复: 添加类型检查
        if (err && typeof err === 'object' && 'code' in err) {
            const firebaseError = err as { code: string };
            if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
                setError('邮箱或密码不正确。');
            } else if (firebaseError.code === 'auth/email-already-in-use') {
                setError('该邮箱已被注册。');
            } else {
                setError('发生未知错误，请稍后再试。');
            }
        } else {
             setError('发生未知错误，请稍后再试。');
        }
    }
  };

  if (currentUser) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-800">
            {isSigningUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="mt-2 text-center text-gray-600">
            {isSigningUp ? 'Get started with your secure vault.' : 'Sign in to access your vault.'}
          </p>
        </div>
        <div className="flex border-b">
          <button
            onClick={() => setIsSigningUp(false)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${!isSigningUp ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSigningUp(true)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${isSigningUp ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign Up
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {error && <p className="text-sm text-center text-red-500 pt-1">{error}</p>}
          <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            {isSigningUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}