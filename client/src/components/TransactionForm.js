// src/components/TransactionForm.js
import React, { useState } from 'react';
import { createTransaction } from '../services/api';

const TransactionForm = ({ onTransactionAdded }) => {
    const [amount, setAmount] = useState('');
    const [userId, setUserId] = useState(''); // Fixed the variable name here
    const [committeeId, setCommitteeId] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const transactionData = { amount, userId, committeeId };
        const newTransaction = await createTransaction(transactionData);
        onTransactionAdded(newTransaction);
        setAmount('');
        setUserId(''); // Fixed the variable name here
        setCommitteeId('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="number"
                placeholder="Transaction Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border p-2 w-full"
                required
            />
            <input
                type="text"
                placeholder="User ID"  // Adjusted the placeholder text for consistency
                value={userId}
                onChange={(e) => setUserId(e.target.value)} // Fixed the function call here
                className="border p-2 w-full"
                required
            />
            <input
                type="text"
                placeholder="Committee ID"
                value={committeeId}
                onChange={(e) => setCommitteeId(e.target.value)}
                className="border p-2 w-full"
                required
            />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                Add Transaction
            </button>
        </form>
    );
};

export default TransactionForm;
