// src/context/CryptoContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { deriveKey } from '../lib/crypto'; // 确保路径正确

interface CryptoContextType {
  encryptionKey: string | null;
  setMasterPassword: (masterPassword: string, salt: string) => void;
  clearEncryptionKey: () => void;
  isKeySet: boolean;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export const CryptoProvider = ({ children }: { children: ReactNode }) => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // 一个派生函数，用于设置密钥
  const setMasterPassword = (masterPassword: string, salt: string) => {
    const key = deriveKey(masterPassword, salt);
    setEncryptionKey(key);
  };

  // 登出或会话结束时清除密钥
  const clearEncryptionKey = () => {
    setEncryptionKey(null);
  };

  const value = {
    encryptionKey,
    setMasterPassword,
    clearEncryptionKey,
    isKeySet: !!encryptionKey, // 一个方便的布尔值
  };

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
};

export const useCrypto = () => {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
};