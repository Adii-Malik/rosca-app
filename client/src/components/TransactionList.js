// src/components/TransactionList.js
import React from 'react';

const TransactionList = ({ transactions }) => {
    return (
        <div className="space-y-4">
            {transactions.map((transaction) => (
                <div key={transaction._id} className="border p-4">
                    <p>Amount: {transaction.amount}</p>
                    <p>User ID: {transaction.userId}</p>
                    <p>Committee ID: {transaction.committeeId}</p>
                </div>
            ))}
        </div>
    );
};

export default TransactionList;