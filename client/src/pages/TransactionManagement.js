// src/pages/TransactionManagement.js
import React, { useEffect, useState } from 'react';
import { fetchTransactions, createTransaction } from '../services/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

const TransactionManagement = () => {
    const [transactions, setTransactions] = useState([]);

    const loadTransactions = async () => {
        const transactionList = await fetchTransactions();
        setTransactions(transactionList);
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    const handleTransactionAdded = async (transactionData) => {
        const newTransaction = await createTransaction(transactionData);
        setTransactions((prevTransactions) => [...prevTransactions, newTransaction]);
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Transaction Management</h1>
            <TransactionForm onTransactionAdded={handleTransactionAdded} />
            <TransactionList transactions={transactions} />
        </div>
    );
};

export default TransactionManagement;