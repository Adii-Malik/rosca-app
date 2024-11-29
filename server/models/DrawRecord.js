// /models/DrawRecord.js
const mongoose = require('mongoose');

const drawRecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    committeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee', required: true },
    date: { type: String, required: true },
});

module.exports = mongoose.model('DrawRecord', drawRecordSchema);