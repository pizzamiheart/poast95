import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Monitor, X, ExternalLink, FileText, LogIn } from 'lucide-react';
import { postTweet, loginWithTwitter, handleTwitterCallback } from './lib/api';
import { useAuthStore } from './lib/store';

interface Post {
  id: string;
  content: string;
  timestamp: Date;
  tweetId?: string;
  error?: string;
}

interface PostWindowProps {
  currentPost: string;
  setCurrentPost: (value: string) => void;
  handlePost: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  charCount: number;
  isPosting: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

const PostWindow: React.FC<PostWindowProps> = ({
  currentPost,
  setCurrentPost,
  handlePost,
  handleKeyDown,
  charCount,
  isPosting,
  onClose,
  isAuthenticated
}) => (
  <div className="fixed inset-0 flex items-center justify-center">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="window"
    >
      <div className="window-title">
        <span className="text-white font-semibold">New Post</span>
        <div className="flex">
          <button className="close-button" onClick={onClose}>
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="window-content">
        {isAuthenticated ? (
          <>
            <textarea
              autoFocus
              value={currentPost}
              onChange={(e) => setCurrentPost(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? (Ctrl/Cmd + Enter to post)"
              className="window-textarea"
              maxLength={280}
              disabled={isPosting}
            />
            <div className="text-right text-sm text-gray-600 mt-1">
              {charCount}/280
            </div>
            <div className="mt-4 space-y-2">
              <button 
                className="window-button w-full"
                onClick={handlePost}
                disabled={isPosting || charCount === 0}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
              {isPosting && (
                <div className="progress-bar-container">
                  <motion.div 
                    className="progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'linear' }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="mb-4">Please sign in to post tweets</p>
            <button 
              className="window-button"
              onClick={() => loginWithTwitter()}
            >
              <LogIn size={16} className="mr-2 inline" />
              Sign in with Twitter
            </button>
          </div>
        )}
      </div>
    </motion.div>
  </div>
);

interface PostsWindowProps {
  posts: Post[];
  onClose: () => void;
}

const PostsWindow: React.FC<PostsWindowProps> = ({ posts, onClose }) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    className="window fixed"
    style={{ 
      left: '30%', 
      top: '20%'
    }}
  >
    <div className="window-title">
      <span className="text-white font-semibold">Posts</span>
      <div className="flex">
        <button className="close-button" onClick={onClose}>
          <X size={12} />
        </button>
      </div>
    </div>
    <div className="window-content">
      <div className="posts-container">
        {posts.map((post) => (
          <div key={post.id} className={`post-file ${post.error ? 'error' : ''}`}>
            <div className="post-icon">
              <FileText size={16} />
            </div>
            <div className="post-file-content">
              <div className="post-file-header">
                <span className="post-timestamp">
                  {post.timestamp.toLocaleString()}
                </span>
                {post.tweetId ? (
                  <a 
                    href={`https://twitter.com/i/web/status/${post.tweetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-on-twitter"
                  >
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <a 
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.content)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-on-twitter"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div className="post-content">
                {post.content}
              </div>
              {post.error && (
                <div className="post-error">
                  {post.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

interface InfoWindowProps {
  onClose: () => void;
}

const InfoWindow: React.FC<InfoWindowProps> = ({ onClose }) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    className="window fixed"
    style={{ 
      left: '40%', 
      top: '30%',
      width: '300px'
    }}
  >
    <div className="window-title">
      <span className="text-white font-semibold">About Poast 95</span>
      <div className="flex">
        <button className="close-button" onClick={onClose}>
          <X size={12} />
        </button>
      </div>
    </div>
    <div className="window-content">
      <div className="text-sm space-y-4">
        <p>Welcome to Poast 95 - your retro-styled Twitter composer!</p>
        <p>This Windows 95-inspired app lets you compose and post tweets in a nostalgic environment. Experience social media like it's 1995!</p>
        <p className="text-xs text-gray-600">Version 1.0.0</p>
      </div>
    </div>
  </motion.div>
);

function App() {
  const { isAuthenticated, username, clearAuth } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPost, setCurrentPost] = useState('');
  const [isPostWindowOpen, setIsPostWindowOpen] = useState(false);
  const [isPostsWindowOpen, setIsPostsWindowOpen] = useState(false);
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      handleTwitterCallback(code, state)
        .catch(error => console.error('Failed to handle Twitter callback:', error));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setCharCount(currentPost.length);
  }, [currentPost]);

  const handlePost = async () => {
    if (!currentPost.trim() || isPosting) return;
    
    setIsPosting(true);
    
    try {
      const tweet = await postTweet(currentPost);
      
      const newPost = {
        id: Date.now().toString(),
        content: currentPost,
        timestamp: new Date(),
        tweetId: tweet.data.id
      };
      
      setPosts(prev => [newPost, ...prev]);
      setCurrentPost('');
      setIsPostWindowOpen(false);
    } catch (error) {
      const newPost = {
        id: Date.now().toString(),
        content: currentPost,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to post tweet'
      };
      
      setPosts(prev => [newPost, ...prev]);
      console.error('Failed to post tweet:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handlePost();
    }
  };

  const handleOpenFolder = () => {
    setIsPostWindowOpen(false);
    setIsPostsWindowOpen(true);
  };

  return (
    <>
      <div className="desktop">
        <div className="flex flex-wrap gap-4">
          <div 
            className="folder"
            onClick={handleOpenFolder}
          >
            <div className="folder-icon win95-folder">
              <Folder size={32} />
            </div>
            <span>Posts</span>
          </div>
          <div 
            className="folder"
            onClick={() => setIsInfoWindowOpen(true)}
          >
            <div className="folder-icon win95-computer">
              <Monitor size={32} />
            </div>
            <span>About</span>
          </div>
        </div>

        <AnimatePresence>
          {isPostWindowOpen && (
            <PostWindow
              key="post-window"
              currentPost={currentPost}
              setCurrentPost={setCurrentPost}
              handlePost={handlePost}
              handleKeyDown={handleKeyDown}
              charCount={charCount}
              isPosting={isPosting}
              onClose={() => setIsPostWindowOpen(false)}
              isAuthenticated={isAuthenticated}
            />
          )}
          {isPostsWindowOpen && (
            <PostsWindow
              key="posts-window"
              posts={posts}
              onClose={() => setIsPostsWindowOpen(false)}
            />
          )}
          {isInfoWindowOpen && (
            <InfoWindow
              key="info-window"
              onClose={() => setIsInfoWindowOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="taskbar">
        <button 
          className="start-button"
          onClick={() => {
            if (!isAuthenticated) {
              loginWithTwitter();
            } else {
              setIsPostWindowOpen(true);
            }
          }}
        >
          {isAuthenticated ? (
            <>
              <span>Start</span>
              <span className="text-sm ml-2">(@{username})</span>
            </>
          ) : (
            <>
              <LogIn size={16} className="mr-2" />
              <span>Sign in with Twitter</span>
            </>
          )}
        </button>
        {isAuthenticated && (
          <button 
            className="taskbar-button"
            onClick={clearAuth}
          >
            Sign Out
          </button>
        )}
      </div>
    </>
  );
}

export default App;