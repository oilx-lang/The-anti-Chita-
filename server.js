const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Update CORS handling
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Log the IP for debugging
    console.log('Request IP:', req.ip);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Store comments in a JSON file
const COMMENTS_FILE = 'comments.json';

// Add to the top of server.js with other constants
const USER_FAVORITES_FILE = 'user_favorites.json';

// Add at the top with other constants
const ADMIN_FILE = 'admin.json';

// Add at the top with other constants
const USERS_FILE = 'users.json';

// Add new constants
const ADMIN_REQUESTS_FILE = 'admin_requests.json';
const OWNER_USERNAME = 'Pepsi'; // The owner username

// Secret key for JWT
const JWT_SECRET = 'your-secret-key-here';

// Add user identification middleware
app.use((req, res, next) => {
    // Generate or get user ID from session/cookie
    if (!req.headers['user-id']) {
        req.userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        res.header('User-Id', req.userId);
    } else {
        req.userId = req.headers['user-id'];
    }
    next();
});

// Add file system error handling helper
async function saveToFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Successfully saved to ${filePath}`);
    } catch (error) {
        console.error(`Error saving to ${filePath}:`, error);
        throw new Error(`Failed to save to ${filePath}: ${error.message}`);
    }
}

// Get all comments
app.get('/api/comments', async (req, res) => {
    try {
        console.log('Fetching comments...'); // Debug log
        
        // Check if file exists
        try {
            await fs.access(COMMENTS_FILE);
        } catch {
            console.log('Comments file not found, creating new one');
            await fs.writeFile(COMMENTS_FILE, JSON.stringify({ comments: [], hallOfFame: [] }));
        }

        const data = await fs.readFile(COMMENTS_FILE, 'utf8');
        console.log('Comments loaded successfully'); // Debug log
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading comments:', error); // Detailed error log
        res.status(500).json({ error: 'Error reading comments: ' + error.message });
    }
});

// Add new comment
app.post('/api/comments', async (req, res) => {
    try {
        console.log('Received comment:', req.body);
        const { name, text } = req.body;
        
        if (!name || !text) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'Name and text are required' });
        }

        const timestamp = new Date().toISOString();
        const newComment = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2)}`, // Guaranteed unique ID
            userId: req.userId, // Store the user ID with the comment
            name,
            text,
            timestamp,
            votes: { fire: 0, shit: 0 }
        };

        // Check if file exists and is readable
        try {
            await fs.access(COMMENTS_FILE, fs.constants.R_OK | fs.constants.W_OK);
        } catch (err) {
            console.log('Comments file not accessible, creating new one');
            await fs.writeFile(COMMENTS_FILE, JSON.stringify({ comments: [], hallOfFame: [] }));
        }

        const fileContent = await fs.readFile(COMMENTS_FILE, 'utf8');
        const data = JSON.parse(fileContent);
        data.comments.push(newComment);
        await fs.writeFile(COMMENTS_FILE, JSON.stringify(data, null, 2));
        
        console.log('Comment saved successfully'); // Debug log
        res.json(newComment);
    } catch (error) {
        console.error('Error saving comment:', error); // Detailed error log
        res.status(500).json({ error: 'Error saving comment: ' + error.message });
    }
});

// Update votes
app.put('/api/comments/:id/vote', async (req, res) => {
    try {
        console.log('Received vote:', req.params.id, req.body);
        const { id } = req.params;
        const { voteType } = req.body;
        
        if (!voteType || !['fire', 'shit'].includes(voteType)) {
            console.log('Invalid vote type:', voteType);
            return res.status(400).json({ error: 'Invalid vote type' });
        }
        
        const fileContent = await fs.readFile(COMMENTS_FILE, 'utf8');
        const data = JSON.parse(fileContent);
        const comment = data.comments.find(c => c.id === id);
        
        if (!comment) {
            console.log('Comment not found:', id);
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Initialize votes object if it doesn't exist
        if (!comment.votes) {
            comment.votes = { fire: 0, shit: 0, voters: {} };
        }
        if (!comment.votes.voters) {
            comment.votes.voters = {};
        }

        // Generate a unique voter ID (you might want to use actual user IDs in a real app)
        const voterId = req.ip; // Using IP address as voter ID

        // Check if user has already voted
        if (comment.votes.voters[voterId]) {
            return res.status(400).json({ error: 'You have already voted on this comment' });
        }

        // Record the vote
        comment.votes[voteType]++;
        comment.votes.voters[voterId] = voteType;
        
        console.log('Updated votes:', comment.votes);
        
        // Check for hall of fame
        if (voteType === 'fire' && comment.votes.fire >= 5) {
            if (!data.hallOfFame.some(c => c.id === id)) {
                const fameComment = {...comment};
                delete fameComment.votes.voters; // Don't store voters in hall of fame
                data.hallOfFame.push(fameComment);
                console.log('Added to hall of fame:', id);
            }
        }
        
        await fs.writeFile(COMMENTS_FILE, JSON.stringify(data, null, 2));
        
        // Don't send voters data to client
        const responseComment = {...comment};
        delete responseComment.votes.voters;
        
        console.log('Vote saved successfully');
        res.json(responseComment);
    } catch (error) {
        console.error('Error updating votes:', error);
        res.status(500).json({ error: 'Error updating votes: ' + error.message });
    }
});

// Update the admin check to handle both IPv4 and IPv6 localhost
function isAdmin(req, res, next) {
    const clientIP = req.ip;
    const allowedIPs = ['::1', '::ffff:127.0.0.1', '127.0.0.1']; // localhost in different formats
    
    console.log('Client IP:', clientIP);
    if (allowedIPs.includes(clientIP)) {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
}

// Update the admin routes to include better error handling
app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const data = JSON.parse(await fs.readFile(COMMENTS_FILE, 'utf8'));
        
        const comment = data.comments.find(c => c.id === id);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check permissions
        const isOwner = req.user.username === OWNER_USERNAME;
        const isCommentOwner = comment.userId === req.userId;
        const adminData = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
        const isAdmin = adminData.adminIds.includes(req.user.id);

        if (!isOwner && !isCommentOwner && !isAdmin) {
            return res.status(403).json({ 
                error: 'You do not have permission to delete this comment'
            });
        }
        
        // Remove from comments and hall of fame
        data.comments = data.comments.filter(c => c.id !== id);
        data.hallOfFame = data.hallOfFame.filter(c => c.id !== id);
        
        await saveToFile(COMMENTS_FILE, data);
        
        res.json({ 
            success: true, 
            message: isOwner ? 'Comment deleted by Owner' : 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Error deleting comment' });
    }
});

app.put('/api/comments/:id/star', isAdmin, async (req, res) => {
    try {
        console.log('Starring comment:', req.params.id);
        const { id } = req.params;
        const data = JSON.parse(await fs.readFile(COMMENTS_FILE, 'utf8'));
        
        const comment = data.comments.find(c => c.id === id);
        if (!comment) {
            console.log('Comment not found:', id);
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        comment.starred = !comment.starred; // Toggle star status
        console.log('New star status:', comment.starred);
        
        await fs.writeFile(COMMENTS_FILE, JSON.stringify(data, null, 2));
        res.json(comment);
    } catch (error) {
        console.error('Error starring comment:', error);
        res.status(500).json({ error: 'Error starring comment: ' + error.message });
    }
});

// Add a route for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add error handling for static files
app.use((err, req, res, next) => {
    console.error('Static file error:', err);
    next(err);
});

// Add new route to handle user favorites
app.get('/api/favorites', async (req, res) => {
    try {
        const userId = req.ip;
        const favoritesData = JSON.parse(await fs.readFile(USER_FAVORITES_FILE, 'utf8'));
        const userFavorites = favoritesData[userId] || [];
        
        // Get all comments to find the favorited ones
        const commentsData = JSON.parse(await fs.readFile(COMMENTS_FILE, 'utf8'));
        const favoriteComments = commentsData.comments.filter(comment => 
            userFavorites.includes(comment.id)
        );
        
        res.json(favoriteComments);
    } catch (error) {
        res.status(500).json({ error: 'Error loading favorites' });
    }
});

// Update the favorites endpoint
app.put('/api/comments/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.ip;
        
        // Load favorites
        let favoritesData = {};
        try {
            const fileContent = await fs.readFile(USER_FAVORITES_FILE, 'utf8');
            favoritesData = JSON.parse(fileContent);
        } catch (error) {
            console.log('Creating new favorites file');
            await saveToFile(USER_FAVORITES_FILE, {});
        }
        
        favoritesData[userId] = favoritesData[userId] || [];
        
        // Toggle favorite status
        const isFavorited = favoritesData[userId].includes(id);
        if (isFavorited) {
            favoritesData[userId] = favoritesData[userId].filter(commentId => commentId !== id);
        } else {
            favoritesData[userId].push(id);
        }
        
        // Save updated favorites
        await saveToFile(USER_FAVORITES_FILE, favoritesData);
        
        res.json({ 
            id,
            isFavorited: !isFavorited
        });
    } catch (error) {
        console.error('Error updating favorite:', error);
        res.status(500).json({ error: 'Error updating favorite: ' + error.message });
    }
});

// Add admin authentication middleware
async function isAdmin(req, res, next) {
    try {
        const adminData = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
        const isAdminUser = adminData.adminIds.includes(req.userId);
        
        if (isAdminUser) {
            req.isAdmin = true;
            next();
        } else {
            res.status(403).json({ error: 'Unauthorized: Admin access required' });
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ error: 'Error checking admin status' });
    }
}

// Add admin registration endpoint
app.post('/api/admin/register', async (req, res) => {
    try {
        const userId = req.userId;
        let adminData = { adminIds: [] };
        
        try {
            const fileContent = await fs.readFile(ADMIN_FILE, 'utf8');
            adminData = JSON.parse(fileContent);
        } catch {
            // Create new admin file if it doesn't exist
            await saveToFile(ADMIN_FILE, adminData);
        }
        
        if (!adminData.adminIds.includes(userId)) {
            adminData.adminIds.push(userId);
            await saveToFile(ADMIN_FILE, adminData);
        }
        
        res.json({ success: true, message: 'Admin access granted' });
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ error: 'Error registering admin' });
    }
});

// Add admin check endpoint
app.get('/api/admin/check', async (req, res) => {
    try {
        const adminData = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
        const isAdminUser = adminData.adminIds.includes(req.userId);
        res.json({ isAdmin: isAdminUser });
    } catch (error) {
        res.json({ isAdmin: false });
    }
});

// Initialize users file
async function initializeUsersFile() {
    try {
        await fs.access(USERS_FILE);
    } catch {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }));
    }
}

// Initialize admin requests file
async function initializeAdminRequestsFile() {
    try {
        await fs.access(ADMIN_REQUESTS_FILE);
    } catch {
        await saveToFile(ADMIN_REQUESTS_FILE, { requests: [] });
    }
}

// Update initialization
async function initializeFiles() {
    try {
        const files = [COMMENTS_FILE, USER_FAVORITES_FILE, USERS_FILE, ADMIN_REQUESTS_FILE];
        for (const file of files) {
            try {
                await fs.access(file);
                console.log(`${file} exists`);
            } catch {
                console.log(`Creating ${file}`);
                const initialData = file === COMMENTS_FILE ? 
                    { comments: [], hallOfFame: [] } : 
                    file === USER_FAVORITES_FILE ? {} :
                    file === ADMIN_REQUESTS_FILE ? { requests: [] } :
                    { users: [] };
                await saveToFile(file, initialData);
            }
        }
    } catch (error) {
        console.error('Error initializing files:', error);
        throw error;
    }
}

// Update server startup
initializeFiles()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
            console.log('Files initialized successfully');
        });
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

// Add authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Read existing users
        const data = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        
        // Check if username already exists
        if (data.users.some(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword
        };
        
        // Add user to database
        data.users.push(newUser);
        await saveToFile(USERS_FILE, data);
        
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Read users
        const data = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        
        // Find user
        const user = data.users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Create token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            username: user.username,
            message: 'Logged in successfully'
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Add authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Add admin request endpoint
app.post('/api/admin/request', authenticateToken, async (req, res) => {
    try {
        const { reason } = req.body;
        const username = req.user.username;
        
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }
        
        const data = JSON.parse(await fs.readFile(ADMIN_REQUESTS_FILE, 'utf8'));
        
        // Check if user already has a pending request
        if (data.requests.some(r => r.username === username && r.status === 'pending')) {
            return res.status(400).json({ error: 'You already have a pending request' });
        }
        
        const request = {
            id: Date.now().toString(),
            username,
            reason,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        data.requests.push(request);
        await saveToFile(ADMIN_REQUESTS_FILE, data);
        
        res.json({ success: true, message: 'Admin request submitted' });
    } catch (error) {
        console.error('Error submitting admin request:', error);
        res.status(500).json({ error: 'Error submitting request' });
    }
});

// Get admin requests (owner only)
app.get('/api/admin/requests', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== OWNER_USERNAME) {
            return res.status(403).json({ error: 'Only the owner can view admin requests' });
        }
        
        const data = JSON.parse(await fs.readFile(ADMIN_REQUESTS_FILE, 'utf8'));
        res.json(data.requests);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching admin requests' });
    }
});

// Handle admin request (owner only)
app.put('/api/admin/requests/:requestId', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== OWNER_USERNAME) {
            return res.status(403).json({ error: 'Only the owner can approve/deny requests' });
        }
        
        const { requestId } = req.params;
        const { action } = req.body; // 'approve' or 'deny'
        
        const requestsData = JSON.parse(await fs.readFile(ADMIN_REQUESTS_FILE, 'utf8'));
        const request = requestsData.requests.find(r => r.id === requestId);
        
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        if (action === 'approve') {
            const adminData = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
            const userData = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
            const user = userData.users.find(u => u.username === request.username);
            
            if (user) {
                adminData.adminIds.push(user.id);
                await saveToFile(ADMIN_FILE, adminData);
            }
        }
        
        request.status = action === 'approve' ? 'approved' : 'denied';
        await saveToFile(ADMIN_REQUESTS_FILE, requestsData);
        
        res.json({ success: true, message: `Request ${request.status}` });
    } catch (error) {
        res.status(500).json({ error: 'Error handling request' });
    }
}); 