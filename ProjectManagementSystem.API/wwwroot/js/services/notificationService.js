import { apiClient } from '../api/apiClient.js';
import { Toast } from '../utils/uiUtils.js';
import { authService } from './authService.js';
import { workItemService } from './workItemService.js';
import { projectService } from './projectService.js';

class NotificationService {
    constructor() {
        this.notificationHub = null;
        this.connectionPromise = null;
        this.listeners = new Map();
        this.unreadCount = 0;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
        this.connectionId = null;
        
        // Initialize SignalR connection
        this._initSignalR();
        
        // Listen for authentication state changes
        authService.addAuthListener((isAuthenticated) => {
            if (isAuthenticated) {
                this.connect();
            } else {
                this.disconnect();
            }
        });
    }
    
    // Initialize SignalR connection
    _initSignalR() {
        // Check if SignalR is available
        if (typeof signalR === 'undefined') {
            console.warn('SignalR not available. Real-time features will be disabled.');
            return;
        }
        
        try {
            // Create hub connection
            this.notificationHub = new signalR.HubConnectionBuilder()
                .withUrl('/hubs/notifications', {
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets,
                    accessTokenFactory: () => authService.getToken()
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: (retryContext) => {
                        // Exponential backoff with jitter
                        const baseDelay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                        const jitter = Math.random() * 1000;
                        return baseDelay + jitter;
                    }
                })
                .configureLogging(signalR.LogLevel.Information)
                .build();
            
            // Set up hub event handlers
            this._setupHubHandlers();
            
        } catch (error) {
            console.error('Failed to initialize SignalR:', error);
        }
    }
    
    // Set up SignalR hub event handlers
    _setupHubHandlers() {
        if (!this.notificationHub) return;
        
        // Connection events
        this.notificationHub.onclose(error => {
            console.log('SignalR connection closed', error);
            this.isConnected = false;
            this._handleConnectionStateChange();
            
            // Try to reconnect if not manually disconnected
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                console.log(`Attempting to reconnect in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                
                setTimeout(() => this.connect(), delay);
            }
        });
        
        this.notificationHub.onreconnecting(error => {
            console.log('SignalR reconnecting...', error);
            this.isConnected = false;
            this._handleConnectionStateChange();
        });
        
        this.notificationHub.onreconnected(connectionId => {
            console.log('SignalR reconnected. Connection ID:', connectionId);
            this.connectionId = connectionId;
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this._handleConnectionStateChange();
            this._resubscribeToChannels();
        });
        
        // Notification events
        this.notificationHub.on('ReceiveNotification', (notification) => {
            this._handleNotification(notification);
        });
        
        this.notificationHub.on('UpdateUnreadCount', (count) => {
            this.unreadCount = count;
            this._notifyListeners('unreadCount', this.unreadCount);
        });
        
        // System events
        this.notificationHub.on('SystemMessage', (message) => {
            console.log('System message:', message);
            Toast.info(message);
        });
    }
    
    // Connect to the notification hub
    async connect() {
        if (!this.notificationHub || this.connectionPromise) {
            return this.connectionPromise;
        }
        
        try {
            this.connectionPromise = (async () => {
                try {
                    await this.notificationHub.start();
                    console.log('SignalR connected. Connection ID:', this.notificationHub.connectionId);
                    
                    this.isConnected = true;
                    this.connectionId = this.notificationHub.connectionId;
                    this.reconnectAttempts = 0;
                    
                    // Initialize unread count
                    await this._initializeUnreadCount();
                    
                    // Notify listeners
                    this._handleConnectionStateChange();
                    
                    return true;
                } catch (error) {
                    console.error('Error connecting to notification hub:', error);
                    this.isConnected = false;
                    this._handleConnectionStateChange();
                    throw error;
                } finally {
                    this.connectionPromise = null;
                }
            })();
            
            return await this.connectionPromise;
        } catch (error) {
            console.error('Error in connection promise:', error);
            this.connectionPromise = null;
            throw error;
        }
    }
    
    // Disconnect from the notification hub
    async disconnect() {
        if (!this.notificationHub) return;
        
        try {
            await this.notificationHub.stop();
        } catch (error) {
            console.error('Error disconnecting from notification hub:', error);
        } finally {
            this.isConnected = false;
            this.connectionId = null;
            this._handleConnectionStateChange();
        }
    }
    
    // Initialize unread notification count
    async _initializeUnreadCount() {
        try {
            const response = await apiClient.fetch('/api/notifications/unread-count');
            if (response && typeof response.count === 'number') {
                this.unreadCount = response.count;
                this._notifyListeners('unreadCount', this.unreadCount);
            }
        } catch (error) {
            console.error('Error initializing unread count:', error);
        }
    }
    
    // Handle incoming notification
    _handleNotification(notification) {
        if (!notification) return;
        
        console.log('Received notification:', notification);
        
        // Update unread count
        if (!notification.isRead) {
            this.unreadCount++;
            this._notifyListeners('unreadCount', this.unreadCount);
        }
        
        // Show toast notification
        this._showToastNotification(notification);
        
        // Notify specific listeners for this notification type
        this._notifyListeners(`notification:${notification.type}`, notification);
        
        // Notify general notification listeners
        this._notifyListeners('notification', notification);
        
        // Invalidate relevant caches based on notification type
        this._invalidateCaches(notification);
    }
    
    // Show toast notification
    _showToastNotification(notification) {
        if (!notification) return;
        
        const { title, message, type = 'info', action } = notification;
        
        // Skip toast if no message
        if (!message) return;
        
        // Show appropriate toast based on type
        switch (type.toLowerCase()) {
            case 'success':
                Toast.success(message, title);
                break;
            case 'warning':
                Toast.warning(message, title);
                break;
            case 'error':
                Toast.error(message, title);
                break;
            case 'info':
            default:
                Toast.info(message, title);
                break;
        }
    }
    
    // Invalidate caches based on notification type
    _invalidateCaches(notification) {
        if (!notification || !notification.entityType) return;
        
        const { entityType, entityId } = notification;
        
        switch (entityType.toLowerCase()) {
            case 'workitem':
                workItemService.invalidateCache();
                if (entityId) {
                    workItemService.invalidateCache(`workItem_${entityId}`);
                }
                break;
                
            case 'project':
                projectService.invalidateCache();
                if (entityId) {
                    projectService.invalidateCache(`project_${entityId}`);
                }
                break;
                
            // Add more entity types as needed
                
            default:
                break;
        }
        
        // Always invalidate notifications cache when receiving a new notification
        this._invalidateCache('notifications');
    }
    
    // Handle connection state changes
    _handleConnectionStateChange() {
        this._notifyListeners('connectionState', this.isConnected ? 'connected' : 'disconnected');
    }
    
    // Resubscribe to channels after reconnection
    async _resubscribeToChannels() {
        // Get current subscriptions from the listeners map
        const channels = [];
        
        this.listeners.forEach((_, key) => {
            if (key.startsWith('channel:')) {
                const channel = key.replace('channel:', '');
                if (channel && !channels.includes(channel)) {
                    channels.push(channel);
                }
            }
        });
        
        // Resubscribe to each channel
        if (channels.length > 0) {
            try {
                await this.notificationHub.invoke('SubscribeToChannels', channels);
            } catch (error) {
                console.error('Error resubscribing to channels:', error);
            }
        }
    }
    
    // Subscribe to a notification channel
    async subscribeToChannel(channel) {
        if (!channel || !this.isConnected || !this.notificationHub) return;
        
        try {
            await this.notificationHub.invoke('SubscribeToChannel', channel);
            console.log(`Subscribed to channel: ${channel}`);
            return true;
        } catch (error) {
            console.error(`Error subscribing to channel ${channel}:`, error);
            return false;
        }
    }
    
    // Unsubscribe from a notification channel
    async unsubscribeFromChannel(channel) {
        if (!channel || !this.isConnected || !this.notificationHub) return;
        
        try {
            await this.notificationHub.invoke('UnsubscribeFromChannel', channel);
            console.log(`Unsubscribed from channel: ${channel}`);
            return true;
        } catch (error) {
            console.error(`Error unsubscribing from channel ${channel}:`, error);
            return false;
        }
    }
    
    // Get notifications with pagination
    async getNotifications(page = 1, pageSize = 10, isRead = null) {
        const cacheKey = `notifications_${page}_${pageSize}_${isRead}`;
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }
        
        try {
            let url = `/api/notifications?page=${page}&pageSize=${pageSize}`;
            if (isRead !== null) {
                url += `&isRead=${isRead}`;
            }
            
            const response = await apiClient.fetch(url);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return { items: [], totalCount: 0, page, pageSize };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }
    
    // Mark notification as read
    async markAsRead(notificationId) {
        if (!notificationId) return false;
        
        try {
            const response = await apiClient.markNotificationAsRead(notificationId);
            
            if (response && response.success) {
                // Update unread count if needed
                if (this.unreadCount > 0) {
                    this.unreadCount--;
                    this._notifyListeners('unreadCount', this.unreadCount);
                }
                
                // Invalidate notifications cache
                this._invalidateCache('notifications');
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error marking notification ${notificationId} as read:`, error);
            throw error;
        }
    }
    
    // Mark all notifications as read
    async markAllAsRead() {
        try {
            const response = await apiClient.markAllNotificationsAsRead();
            
            if (response && response.success) {
                // Reset unread count
                this.unreadCount = 0;
                this._notifyListeners('unreadCount', this.unreadCount);
                
                // Invalidate notifications cache
                this._invalidateCache('notifications');
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
    
    // Delete a notification
    async deleteNotification(notificationId) {
        if (!notificationId) return false;
        
        try {
            const response = await apiClient.deleteNotification(notificationId);
            
            if (response && response.success) {
                // Update unread count if needed
                const notification = this._getFromCache(`notification_${notificationId}`);
                if (notification && !notification.isRead && this.unreadCount > 0) {
                    this.unreadCount--;
                    this._notifyListeners('unreadCount', this.unreadCount);
                }
                
                // Invalidate notifications cache
                this._invalidateCache('notifications');
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error deleting notification ${notificationId}:`, error);
            throw error;
        }
    }
    
    // Get unread notification count
    getUnreadCount() {
        return this.unreadCount;
    }
    
    // Check if connected to the notification hub
    isConnectedToHub() {
        return this.isConnected;
    }
    
    // Add event listener
    addEventListener(event, callback) {
        if (!event || typeof callback !== 'function') return;
        
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(callback);
        
        // If this is a channel subscription and we're connected, subscribe to the channel
        if (event.startsWith('channel:') && this.isConnected) {
            const channel = event.replace('channel:', '');
            this.subscribeToChannel(channel);
        }
        
        // Return unsubscribe function
        return () => this.removeEventListener(event, callback);
    }
    
    // Remove event listener
    removeEventListener(event, callback) {
        if (!event || !this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        callbacks.delete(callback);
        
        // If no more listeners for this event, clean up
        if (callbacks.size === 0) {
            this.listeners.delete(event);
            
            // If this was a channel subscription and we're connected, unsubscribe
            if (event.startsWith('channel:') && this.isConnected) {
                const channel = event.replace('channel:', '');
                this.unsubscribeFromChannel(channel);
            }
        }
    }
    
    // Notify all listeners for a specific event
    _notifyListeners(event, data) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }
    
    // Get data from cache
    _getFromCache(key) {
        const cached = this.cache.get(key);
        return cached ? cached.data : null;
    }
    
    // Add data to cache
    _addToCache(key, data, ttl = 60000) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    
    // Invalidate cache by key prefix
    _invalidateCache(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
    
    // Clean up expired cache entries
    _cleanupExpiredCache() {
        const now = Date.now();
        
        for (const [key, { timestamp, ttl }] of this.cache.entries()) {
            if (now - timestamp > ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Create a singleton instance
export const notificationService = new NotificationService();

// Initialize connection when the module loads
if (authService.isAuthenticated) {
    notificationService.connect().catch(error => {
        console.error('Failed to connect to notification hub:', error);
    });
}

// Set up periodic cache cleanup
setInterval(() => {
    notificationService._cleanupExpiredCache();
}, 5 * 60 * 1000); // Every 5 minutes

export default notificationService;
