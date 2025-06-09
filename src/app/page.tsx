// src/app/page.tsx
"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCrypto } from '../context/CryptoContext';
import { generateSalt, encrypt, decrypt, generateStrongPassword } from '../lib/crypto';
import { signOut } from 'firebase/auth';

// 类型定义
interface PasswordData {
  website: string;
  username: string;
  password?: string;
}
interface PasswordEntry extends PasswordData {
  id: string;
}

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { encryptionKey, setMasterPassword, isKeySet, clearEncryptionKey } = useCrypto();

  // 确保所有用于 input 的状态都以空字符串 '' 初始化
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSalt, setUserSalt] = useState<string | null>(null);
  const [isCheckingSalt, setIsCheckingSalt] = useState(true);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Effect Hooks
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    const saltRef = doc(db, 'users', currentUser.uid);
    getDoc(saltRef).then(docSnap => {
      setUserSalt(docSnap.exists() ? docSnap.data().salt : null);
      setIsCheckingSalt(false);
    });
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (!isKeySet || !currentUser || !encryptionKey) {
        setIsLoading(false);
        setPasswords([]);
        return;
    }
    setIsLoading(true);
    const q = query(collection(db, 'passwords'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const decryptedPasswords: PasswordEntry[] = [];
      let decryptionFailed = false;
      for (const doc of querySnapshot.docs) {
        try {
          const decryptedData = decrypt(doc.data().encryptedData, encryptionKey);
          decryptedPasswords.push({ id: doc.id, ...(decryptedData as PasswordData) });
        } catch (e) {
            console.error("A password entry failed to decrypt:", e);
            setError("解密失败！主密码可能不正确。");
            clearEncryptionKey();
            decryptionFailed = true;
            break; 
        }
      }
      if (!decryptionFailed) { setPasswords(decryptedPasswords); }
      setIsLoading(false);
    }, (err) => {
        console.error("Error fetching passwords:", err);
        setError("无法获取密码。");
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isKeySet, currentUser, encryptionKey, clearEncryptionKey]);

  // Derived State
  const filteredPasswords = useMemo(() => {
    return passwords.filter(p => 
        p.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [passwords, searchTerm]);

  // Handlers
  const handleUnlockOrCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!masterPasswordInput) { setError("请输入主密码。"); return; }
    let saltToUse = userSalt;
    if (!saltToUse) {
        saltToUse = generateSalt();
        try {
            if (!currentUser) throw new Error("User not found");
            await setDoc(doc(db, 'users', currentUser.uid), { salt: saltToUse });
            setUserSalt(saltToUse);
        } catch (err) {
            console.error("Error saving user salt:", err);
            setError("无法保存您的账户信息，请刷新重试。");
            return;
        }
    }
    setMasterPassword(masterPasswordInput, saltToUse);
  };
  
  const handleAddPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!website || !newPassword || !currentUser || !encryptionKey) return;
    const dataToEncrypt: PasswordData = { website, username, password: newPassword };
    const ciphertext = encrypt(dataToEncrypt, encryptionKey);
    await addDoc(collection(db, "passwords"), { userId: currentUser.uid, encryptedData: ciphertext });
    setWebsite(''); setUsername(''); setNewPassword('');
    setSuccess('密码已成功保存！');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpdatePassword = async (id: string, data: Omit<PasswordEntry, 'id'>) => {
    if (!encryptionKey) return;
    const ciphertext = encrypt(data, encryptionKey);
    await updateDoc(doc(db, "passwords", id), { encryptedData: ciphertext });
    setEditingPassword(null);
    setSuccess('密码已成功更新！');
    setTimeout(() => setSuccess(''), 3000);
  }
  
  const handleDeletePassword = async (id: string) => {
    if(confirm("你确定要删除这条密码吗？")) {
        await deleteDoc(doc(db, "passwords", id));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    clearEncryptionKey();
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({...prev, [id]: !prev[id]}));
  }

  // 修复: 确保 handleGeneratePassword 只被定义一次
  const handleGeneratePassword = () => {
    setNewPassword(generateStrongPassword());
  }

  // Render Logic
  if (authLoading || isCheckingSalt) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }
  if (!currentUser) return null;
  if (!isKeySet) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-center text-gray-900">{userSalt ? "Unlock Your Vault" : "Create Your Master Password"}</h1>
          <p className="text-center text-gray-600">{userSalt ? `Welcome back, ${currentUser.email}!` : "Welcome! Set a strong password."}</p>
          <form onSubmit={handleUnlockOrCreate} className="space-y-6">
            <input type="password" value={masterPasswordInput} onChange={(e) => setMasterPasswordInput(e.target.value)} placeholder="Master Password" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
            {error && <p className="text-sm text-center text-red-500">{error}</p>}
            <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{userSalt ? "Unlock" : "Set and Continue"}</button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container px-4 py-4 mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">My Secure Vault</h1>
          <div className='flex items-center space-x-4'>
            <p className='hidden sm:block text-gray-600'>{currentUser.email}</p>
            <button onClick={handleSignOut} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sign Out</button>
          </div>
        </div>
      </header>
      <main className="container p-4 mx-auto md:p-6 space-y-8">
        {success && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">{success}</div>}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Password</h2>
          <form onSubmit={handleAddPassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username/Email" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
            <div className="relative md:col-span-2">
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
              <button type="button" onClick={handleGeneratePassword} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-white bg-gray-500 rounded hover:bg-gray-600">Generate</button>
            </div>
            <button type="submit" className="md:col-span-2 w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Save Password</button>
          </form>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Passwords</h2>
          <input type="text" placeholder="Search by website or username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"/>
          {isLoading ? <p>Loading...</p> : (
            <ul className="space-y-3">
              {filteredPasswords.map(p => (
                <li key={p.id} className="p-3 bg-gray-50 rounded-md border flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex-1 mb-2 md:mb-0">
                    <p className="font-bold text-gray-800">{p.website}</p>
                    <p className="text-sm text-gray-600">{p.username}</p>
                    <div className="flex items-center mt-1">
                      <p className="font-mono text-sm text-gray-700">{visiblePasswords[p.id] ? p.password : '••••••••••••'}</p>
                      <button onClick={() => togglePasswordVisibility(p.id)} className="ml-3 text-xs text-blue-600 hover:underline">{visiblePasswords[p.id] ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => navigator.clipboard.writeText(p.password!)} className="px-3 py-1 text-xs font-medium text-white bg-gray-600 rounded shadow-sm hover:bg-gray-700">Copy</button>
                    <button onClick={() => setEditingPassword(p)} className="px-3 py-1 text-xs font-medium text-white bg-yellow-500 rounded shadow-sm hover:bg-yellow-600">Edit</button>
                    <button onClick={() => handleDeletePassword(p.id)} className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded shadow-sm hover:bg-red-700">Delete</button>
                  </div>
                </li>
              ))}
              {filteredPasswords.length === 0 && <p className="py-4 text-center text-gray-500">No passwords found.</p>}
            </ul>
          )}
        </div>
      </main>
      {editingPassword && (<EditModal password={editingPassword} onClose={() => setEditingPassword(null)} onSave={handleUpdatePassword}/>)}
    </div>
  );
}

// Edit Modal Component
interface EditModalProps {
    password: PasswordEntry;
    onClose: () => void;
    onSave: (id: string, data: Omit<PasswordEntry, 'id'>) => void;
}
function EditModal({ password, onClose, onSave }: EditModalProps) {
    const [website, setWebsite] = useState(password.website);
    const [username, setUsername] = useState(password.username);
    const [pass, setPass] = useState(password.password || '');
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(password.id, { website, username, password: pass });
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                <h2 className="mb-4 text-2xl font-semibold">Edit Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                    <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                    <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}