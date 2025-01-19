// Random Ninja Name Generator
function generateNinjaName() {
    const adjectives = ['Silent', 'Shadow', 'Dark', 'Swift', 'Stealth', 'Night'];
    const nouns = ['Warrior', 'Ninja', 'Hunter', 'Blade', 'Strike', 'Shadow'];
    const randomNum = Math.floor(Math.random() * 99);
    
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${randomAdj}${randomNoun}${randomNum}`;
}

// Notification System
function showNotification(message, type = 'success') {
    const notifBell = document.getElementById('notifBell');
    const notifCount = document.querySelector('.notif-count');
    
    if (type === 'success') {
        notifCount.textContent = parseInt(notifCount.textContent) + 1;
        notifBell.style.display = 'block';
    }
    
    // Create toast container
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create icon based on type
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    switch(type) {
        case 'delete':
            icon.textContent = '🗑️';
            break;
        case 'error':
            icon.textContent = '❌';
            break;
        default:
            icon.textContent = '✨';
    }
    
    // Create message
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    // Create progress bar
    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    
    // Assemble toast
    toast.appendChild(icon);
    toast.appendChild(messageSpan);
    toast.appendChild(progress);
    document.body.appendChild(toast);
    
    // Remove toast after animation
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle Anonymous Mode
document.getElementById('anonymousMode').addEventListener('change', function() {
    const nameInput = document.getElementById('name');
    if (this.checked) {
        nameInput.value = generateNinjaName();
        nameInput.disabled = true;
    } else {
        nameInput.value = '';
        nameInput.disabled = false;
    }
});

// Add glitch effect on hover
document.querySelectorAll('.tech-border').forEach(element => {
    element.addEventListener('mouseover', () => {
        element.style.transform = `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`;
    });
    
    element.addEventListener('mouseout', () => {
        element.style.transform = 'none';
    });
});

// Add typing effect to buttons - only once per button
document.querySelectorAll('button').forEach(button => {
    const originalText = button.textContent;
    let hasAnimated = false;
    
    button.addEventListener('mouseover', () => {
        if (hasAnimated) return; // Skip if already animated
        
        hasAnimated = true;
        let i = 0;
        const interval = setInterval(() => {
            button.textContent = originalText.slice(0, i) + '█';
            i++;
            if (i > originalText.length) {
                clearInterval(interval);
                button.textContent = originalText;
            }
        }, 50);
    });
});

// Update the document title
document.title = 'Chita Zone 🐆';

// Update placeholder text
document.querySelector('#commentText').placeholder = 'Drop that anti-chita comment here... 🔥';

// Add user ID handling
let userId = localStorage.getItem('userId');

// Function to get or create user ID
function getUserId() {
    if (!userId) {
        userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

// Update fetch headers to include user ID and auth token
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'User-Id': getUserId()
    };
    
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// Create comment card element
function createCommentCard(comment) {
    const card = document.createElement('div');
    card.className = 'comment-card';
    card.dataset.id = comment.id;
    
    const timestamp = new Date(comment.timestamp).toLocaleString();
    
    // Check if this is the user's comment
    const isUserComment = comment.userId === getUserId();
    
    // Check if user has already voted on this comment
    const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
    const userVote = votedComments[comment.id];
    
    // Create the admin controls based on ownership
    const adminControls = document.createElement('div');
    adminControls.className = 'admin-controls';
    
    // Check if user is owner or admin
    const username = localStorage.getItem('username');
    const isOwner = username === 'Pepsi';
    
    if (isUserComment || isOwner) {
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'admin-btn delete-btn';
        deleteBtn.innerHTML = isOwner ? '👑🗑️' : '🗑️';
        deleteBtn.title = isOwner ? 'Delete as Owner' : 'Delete Comment';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            
            const confirmed = await showCustomConfirm(
                isOwner ? 
                'Are you sure you want to delete this comment as Owner?' : 
                'Are you sure you want to delete this comment?'
            );
            if (!confirmed) return;
            
            try {
                const response = await fetch(`/api/comments/${comment.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete comment');
                }
                
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateX(100px)';
                
                setTimeout(() => {
                    document.querySelectorAll(`.comment-card[data-id="${comment.id}"]`)
                        .forEach(card => card.remove());
                }, 300);
                
                showNotification('Comment deleted successfully', 'delete');
            } catch (error) {
                console.error('Error deleting comment:', error);
                showNotification(error.message || 'Error deleting comment', 'error');
            }
        };
        adminControls.appendChild(deleteBtn);
    }
    
    // Add favorite button for all users
    const favoriteBtn = document.createElement('span');
    favoriteBtn.className = 'admin-btn favorite-btn';
    favoriteBtn.innerHTML = '⭐';
    favoriteBtn.title = comment.isFavorited ? 'Remove from Favorites' : 'Add to Favorites';
    
    if (comment.isFavorited) {
        favoriteBtn.classList.add('favorited');
    }
    
    favoriteBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`/api/comments/${comment.id}/favorite`, {
                method: 'PUT',
                headers: getHeaders()
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update favorite');
            }
            
            const result = await response.json();
            
            // Toggle favorite status visually
            favoriteBtn.classList.toggle('favorited', result.isFavorited);
            comment.isFavorited = result.isFavorited;
            
            // Refresh favorites section
            await loadFavorites();
            
            // Add confetti effect when adding to favorites
            if (result.isFavorited) {
                const rect = favoriteBtn.getBoundingClientRect();
                createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
            
            showNotification(
                result.isFavorited ? 'Added to favorites ⭐' : 'Removed from favorites',
                'success'
            );
        } catch (error) {
            console.error('Error updating favorite:', error);
            showNotification(error.message || 'Error updating favorite', 'error');
        }
    };
    
    adminControls.appendChild(favoriteBtn);
    
    // Update the card HTML
    card.innerHTML = `
        <div class="comment-header">
            <strong>${comment.name}</strong>
            <span class="timestamp">${timestamp}</span>
        </div>
        <p class="comment-text">${comment.text}</p>
        <div class="comment-actions">
            <button class="fire-btn ${userVote === 'fire' ? 'voted' : ''}" 
                onclick="handleVote(this, 'fire')" 
                ${userVote ? 'disabled' : ''}>
                🔥 <span>${comment.votes?.fire || 0}</span>
            </button>
            <button class="shit-btn ${userVote === 'shit' ? 'voted' : ''}" 
                onclick="handleVote(this, 'shit')"
                ${userVote ? 'disabled' : ''}>
                💩 <span>${comment.votes?.shit || 0}</span>
            </button>
        </div>
    `;
    
    // Add the admin controls to the header
    card.querySelector('.comment-header').appendChild(adminControls);
    
    // Add starred class if comment is starred
    if (comment.starred) {
        card.classList.add('starred');
    }
    
    return card;
}

// Update the addAdminControls function
function addAdminControls(card, comment) {
    const adminControls = document.createElement('div');
    adminControls.className = 'admin-controls';
    
    // Delete button - just emoji
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'admin-btn delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete Comment';
    deleteBtn.style.cursor = 'pointer';
    
    // Update button onclick handler
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        
        const confirmed = await showCustomConfirm('Are you sure you want to delete this comment?');
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/comments/${comment.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete comment');
            }
            
            // Fade out the card before removing
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(100px)';
            
            setTimeout(() => {
                // Remove all instances of this comment
                document.querySelectorAll(`.comment-card[data-id="${comment.id}"]`)
                    .forEach(card => card.remove());
            }, 300);
            
            showNotification('Comment successfully deleted', 'delete');
        } catch (error) {
            console.error('Error deleting comment:', error);
            showNotification(error.message || 'Error deleting comment', 'error');
        }
    };
    
    // Update favorite button
    const favoriteBtn = document.createElement('span');
    favoriteBtn.className = 'admin-btn favorite-btn';
    favoriteBtn.innerHTML = '⭐';
    favoriteBtn.title = comment.isFavorited ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteBtn.style.cursor = 'pointer';
    
    if (comment.isFavorited) {
        favoriteBtn.classList.add('favorited');
    }
    
    favoriteBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`/api/comments/${comment.id}/favorite`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update favorite');
            }
            
            const result = await response.json();
            
            // Toggle favorite status visually
            favoriteBtn.classList.toggle('favorited', result.isFavorited);
            comment.isFavorited = result.isFavorited;
            
            // Refresh favorites section
            await loadFavorites();
            
            // Add confetti effect when adding to favorites
            if (result.isFavorited) {
                const rect = favoriteBtn.getBoundingClientRect();
                createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
            
            showNotification(
                result.isFavorited ? 'Added to favorites ⭐' : 'Removed from favorites',
                'success'
            );
        } catch (error) {
            console.error('Error updating favorite:', error);
            showNotification(error.message || 'Error updating favorite', 'error');
        }
    };
    
    adminControls.appendChild(deleteBtn);
    adminControls.appendChild(favoriteBtn);
    card.querySelector('.comment-header').appendChild(adminControls);
}

// Add new function to load favorites
async function loadFavorites() {
    try {
        const response = await fetch('/api/favorites');
        if (!response.ok) {
            throw new Error('Failed to load favorites');
        }
        
        const favorites = await response.json();
        const favoritesContainer = document.getElementById('starredCards');
        favoritesContainer.innerHTML = '';
        
        if (favorites.length > 0) {
            favorites.forEach(comment => {
                comment.isFavorited = true;
                const card = createCommentCard(comment);
                favoritesContainer.appendChild(card);
            });
        } else {
            favoritesContainer.innerHTML = '<p class="no-comments">No favorite comments yet! Click the ☆ to add some!</p>';
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        showNotification('Error loading favorites', 'error');
    }
}

// Update loadComments to include favorite status
async function loadComments() {
    try {
        const [commentsResponse, favoritesResponse] = await Promise.all([
            fetch('/api/comments'),
            fetch('/api/favorites')
        ]);
        
        if (!commentsResponse.ok || !favoritesResponse.ok) {
            throw new Error('Failed to load data');
        }
        
        const commentsData = await commentsResponse.json();
        const favorites = await favoritesResponse.json();
        const favoriteIds = favorites.map(f => f.id);
        
        // Mark favorited comments
        commentsData.comments = commentsData.comments.map(comment => ({
            ...comment,
            isFavorited: favoriteIds.includes(comment.id)
        }));
        
        // Display regular comments
        const commentCards = document.getElementById('commentCards');
        commentCards.innerHTML = '';
        
        if (commentsData.comments && Array.isArray(commentsData.comments)) {
            commentsData.comments.forEach(comment => {
                const card = createCommentCard(comment);
                commentCards.appendChild(card);
            });
        }
        
        // Display hall of fame
        const fameCards = document.getElementById('fameCards');
        fameCards.innerHTML = '';
        
        if (commentsData.hallOfFame && Array.isArray(commentsData.hallOfFame)) {
            commentsData.hallOfFame.forEach(comment => {
                const card = createCommentCard(comment);
                fameCards.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error loading data', 'error');
    }
}

// Update form submission to save to server
document.getElementById('commentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value || 'Anonymous';
    const text = document.getElementById('commentText').value;
    
    if (name.toLowerCase().includes('chita')) {
        showNotification('❌ Chitas are not allowed to post here!', 'error');
        return;
    }
    
    if (!text.trim()) {
        showNotification('Your comment cannot be empty!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, text })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save comment');
        }
        
        const newComment = await response.json();
        
        // Add new comment to display
        const commentCards = document.getElementById('commentCards');
        const card = createCommentCard(newComment);
        commentCards.appendChild(card);
        
        // Scroll to new comment
        card.scrollIntoView({ behavior: 'smooth' });
        
        // Clear form
        this.reset();
        
        showNotification('🔥 New comment dropped!', 'success');
    } catch (error) {
        console.error('Error saving comment:', error);
        showNotification(error.message || 'Error saving comment', 'error');
    }
});

// Update confetti effect to use original shapes with circular spread
function createConfetti(x, y) {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#FF9933', '#FF5733'];
    const shapes = ['★', '●', '♦', '♠', '♥', '♣', '✦', '✮', '✯'];
    
    // Create more confetti pieces
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Create circular spread using polar coordinates
        const angle = (Math.random() * Math.PI * 2); // Random angle in radians
        const distance = Math.random() * 150; // Random distance from center
        const spreadX = Math.cos(angle) * distance;
        const spreadY = Math.sin(angle) * distance;
        
        confetti.style.left = `${x + spreadX}px`;
        confetti.style.top = `${y + spreadY}px`;
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.fontSize = `${Math.random() * 15 + 15}px`;
        
        // Random initial velocity for more dynamic movement
        const velocity = 5 + Math.random() * 10;
        const velocityAngle = angle + (Math.random() - 0.5) * 0.5; // Slightly vary the angle
        confetti.style.setProperty('--vx', `${Math.cos(velocityAngle) * velocity}`);
        confetti.style.setProperty('--vy', `${Math.sin(velocityAngle) * velocity}`);
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 1500);
    }
}

// Update the handleVote function to enforce one vote per comment
async function handleVote(button, type) {
    const card = button.closest('.comment-card');
    const commentId = card.dataset.id;
    
    // Check if user has already voted on this comment
    if (button.disabled || button.classList.contains('voted') || card.querySelector('.voted')) {
        showNotification('You can only vote once per comment! 🚫', 'error');
        return;
    }
    
    // Disable both buttons immediately to prevent double clicks
    const fireBtn = card.querySelector('.fire-btn');
    const shitBtn = card.querySelector('.shit-btn');
    fireBtn.disabled = true;
    shitBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/comments/${commentId}/vote`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ voteType: type })
        });
        
        if (!response.ok) {
            // Re-enable buttons if vote fails
            fireBtn.disabled = false;
            shitBtn.disabled = false;
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update vote');
        }
        
        const updatedComment = await response.json();
        
        // Update vote count in UI
        const countSpan = button.querySelector('span');
        countSpan.textContent = updatedComment.votes[type];
        
        // Add permanent voted class and disable the button
        button.classList.add('voted');
        button.disabled = true;
        
        // Create confetti effect if it's a fire vote
        if (type === 'fire') {
            const rect = button.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            createConfetti(centerX, centerY);
            setTimeout(() => createConfetti(centerX, centerY), 100);
            setTimeout(() => createConfetti(centerX, centerY), 200);
        }
        
        // Permanently disable the other button
        const otherButton = type === 'fire' ? shitBtn : fireBtn;
        otherButton.disabled = true;
        otherButton.style.opacity = '0.5';
        
        // Save vote to localStorage to persist across page reloads
        const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
        votedComments[commentId] = type;
        localStorage.setItem('votedComments', JSON.stringify(votedComments));
        
        // Check for hall of fame
        if (type === 'fire' && updatedComment.votes.fire >= 5) {
            loadComments(); // Reload all comments to update hall of fame
        }
        
        showNotification(type === 'fire' ? '🔥 Fire vote added!' : '💩 Shit vote added!', 'success');
    } catch (error) {
        console.error('Error updating vote:', error);
        showNotification(error.message || 'Error updating vote', 'error');
    }
}

// Add custom confirm dialog function
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-confirm';
        
        dialog.innerHTML = `
            <div class="confirm-content">
                <p class="confirm-message">${message}</p>
                <div class="confirm-buttons">
                    <button class="confirm-btn confirm-yes">Yes</button>
                    <button class="confirm-btn confirm-no">No</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add fade-in effect
        setTimeout(() => dialog.classList.add('show'), 10);
        
        // Handle button clicks
        dialog.querySelector('.confirm-yes').onclick = () => {
            dialog.classList.remove('show');
            setTimeout(() => dialog.remove(), 300);
            resolve(true);
        };
        
        dialog.querySelector('.confirm-no').onclick = () => {
            dialog.classList.remove('show');
            setTimeout(() => dialog.remove(), 300);
            resolve(false);
        };
    });
}

// Update the event listeners
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        updateAuthUI(true);
    }
    loadComments();
    loadFavorites();
});

// Update the admin registration function
async function registerAsAdmin() {
    if (!localStorage.getItem('token')) {
        showNotification('Please login first', 'error');
        return;
    }
    
    showAdminRequestModal();
}

// Add admin request modal functions
function showAdminRequestModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal show';
    modal.innerHTML = `
        <div class="auth-content">
            <h2>Request Admin Access</h2>
            <form id="adminRequestForm">
                <textarea 
                    placeholder="Why do you want to become an admin?"
                    required
                    style="width: 100%; min-height: 100px;"
                ></textarea>
                <div class="auth-buttons">
                    <button type="submit">Submit Request</button>
                    <button type="button" onclick="this.closest('.auth-modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const reason = e.target.querySelector('textarea').value;
        
        try {
            const response = await fetch('/api/admin/request', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ reason })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error);
            }
            
            modal.remove();
            showNotification('Admin request submitted successfully', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// Add owner-specific UI
async function checkOwnerStatus() {
    const username = localStorage.getItem('username');
    if (username === 'Pepsi') {
        const adminPanel = document.createElement('div');
        adminPanel.className = 'admin-panel';
        adminPanel.innerHTML = `
            <h3>Admin Requests</h3>
            <div class="admin-requests"></div>
        `;
        
        document.querySelector('.container').appendChild(adminPanel);
        await loadAdminRequests();
    }
}

// Load admin requests for owner
async function loadAdminRequests() {
    try {
        const response = await fetch('/api/admin/requests', {
            headers: getHeaders()
        });
        
        if (!response.ok) return;
        
        const requests = await response.json();
        const container = document.querySelector('.admin-requests');
        
        container.innerHTML = requests.map(request => `
            <div class="admin-request ${request.status}">
                <strong>${request.username}</strong>
                <p>${request.reason}</p>
                <small>Requested: ${new Date(request.timestamp).toLocaleString()}</small>
                ${request.status === 'pending' ? `
                    <div class="request-actions">
                        <button onclick="handleAdminRequest('${request.id}', 'approve')">Approve</button>
                        <button onclick="handleAdminRequest('${request.id}', 'deny')">Deny</button>
                    </div>
                ` : `
                    <div class="request-status">${request.status}</div>
                `}
            </div>
        `).join('') || '<p>No pending requests</p>';
    } catch (error) {
        console.error('Error loading admin requests:', error);
    }
}

// Handle admin request approval/denial
async function handleAdminRequest(requestId, action) {
    try {
        const response = await fetch(`/api/admin/requests/${requestId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ action })
        });
        
        if (!response.ok) {
            throw new Error('Failed to handle request');
        }
        
        showNotification(`Request ${action}ed successfully`, 'success');
        loadAdminRequests();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Update auth UI to show owner badge
function updateAuthUI(isLoggedIn) {
    const authDiv = document.querySelector('.nav-auth');
    if (isLoggedIn) {
        const username = localStorage.getItem('username');
        const isOwner = username === 'Pepsi';
        authDiv.innerHTML = `
            <span class="nav-link">Welcome, ${username} ${isOwner ? '👑 Owner' : ''}</span>
            <button onclick="logout()" class="nav-link">Logout</button>
        `;
        if (isOwner) {
            checkOwnerStatus();
        }
    } else {
        authDiv.innerHTML = `
            <button onclick="showAuth('login')" class="nav-link">Login</button>
            <button onclick="showAuth('signup')" class="nav-link">Sign Up</button>
        `;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateAuthUI(false);
    showNotification('Logged out successfully', 'success');
}

// Add auth handling functions
function showAuth(type) {
    document.getElementById('authBackdrop').classList.add('show');
    document.getElementById('authModal').classList.add('show');
    document.getElementById('loginForm').style.display = type === 'login' ? 'flex' : 'none';
    document.getElementById('signupForm').style.display = type === 'signup' ? 'flex' : 'none';
}

function hideAuth() {
    document.getElementById('authBackdrop').classList.remove('show');
    document.getElementById('authModal').classList.remove('show');
}

function switchAuth(type) {
    document.getElementById('loginForm').style.display = type === 'login' ? 'flex' : 'none';
    document.getElementById('signupForm').style.display = type === 'signup' ? 'flex' : 'none';
}

// Update login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        hideAuth();
        showNotification('Successfully logged in! 🎉', 'success');
        updateAuthUI(true);
    } catch (error) {
        showNotification(error.message, 'error');
    }
});

// Update signup form handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    
    // Check for Chita in username
    if (username.toLowerCase().includes('chita') && !chitaNameUnlocked) {
        showNotification('🚫 You must unlock Chita username first by clicking the Chita emoji!', 'error');
        return;
    }
    
    if (password !== confirm) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }
        
        hideAuth();
        showNotification('Account created successfully! Please log in.', 'success');
        switchAuth('login');
    } catch (error) {
        showNotification(error.message, 'error');
    }
});

// Add Chita name unlock feature
let chitaNameUnlocked = false;

document.querySelector('.title-chita').addEventListener('click', function() {
    chitaNameUnlocked = true;
    showNotification('🐆 Chita username unlocked!', 'success');
}); 