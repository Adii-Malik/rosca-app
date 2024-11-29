import React from 'react';
import './Contribution.css';

const ContributionList = ({ contributions, onEdit, onDelete }) => {
    return (
        <div className="list-container">
            {contributions.map((contribution) => (
                <div key={contribution._id} className="card">
                    <div className="card-content">
                        <p><strong>Amount:</strong> Rs {contribution.amount}</p>
                        <p><strong>User:</strong> {contribution.userId?.name || 'Unknown User'}</p>
                        <p><strong>Committee:</strong> {contribution.committeeId?.name || 'Unknown Committee'}</p>
                        <p><strong>Date:</strong> {new Date(contribution.date).toLocaleDateString()}</p>
                    </div>
                    <div className="card-actions">
                        <button onClick={() => onEdit(contribution)} className="btn-secondary">
                            Edit
                        </button>
                        <button onClick={() => onDelete(contribution._id)} className="btn-danger">
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ContributionList;
