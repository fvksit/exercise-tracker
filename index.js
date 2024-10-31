const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Database connection error:', err);
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post('/api/users', async (req, res) => {
    try {
        const { username } = req.body;
        const newUser = new User({ username });
        const savedUser = await newUser.save();
        res.json({ username: savedUser.username, _id: savedUser._id });
    } catch (err) {
        res.status(400).json({ error: 'Username already taken or invalid' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username _id');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving users' });
    }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
    try {
        const { _id } = req.params;
        const { description, duration, date } = req.body;

        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const exercise = new Exercise({
            userId: _id,
            description,
            duration: parseInt(duration),
            date: date ? new Date(date) : new Date()
        });

        const savedExercise = await exercise.save();
        res.json({
            username: user.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toDateString(),
            _id: user._id
        });
    } catch (err) {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.get('/api/users/:_id/logs', async (req, res) => {
    try {
        const { _id } = req.params;
        const { from, to, limit } = req.query;

        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let query = { userId: _id };
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        const exercises = await Exercise.find(query)
            .select('description duration date -_id')
            .limit(parseInt(limit) || 0);

        res.json({
            username: user.username,
            count: exercises.length,
            _id: user._id,
            log: exercises.map(ex => ({
                description: ex.description,
                duration: ex.duration,
                date: ex.date.toDateString()
            }))
        });
    } catch (err) {
        res.status(400).json({ error: 'Invalid data' });
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
