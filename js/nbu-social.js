// nbu-social.js - 社交功能管理器
class SocialManager {
    constructor() {
        this.currentUserId = null;
    }
    
    // 设置当前用户ID
    setCurrentUser(userId) {
        this.currentUserId = userId;
    }

    async createNotification(userId, type, actorId, targetId = null) {
        const messages = {
            'follow': '关注了你',
            'like': '赞了你的主页',
            'dislike': '踩了你的主页', 
            'comment': '评论了你的主页'
        };
        
        const actorProfile = await this.getUserProfile(actorId);
        const actorName = actorProfile?.oc_name || actorProfile?.display_name || '某用户';
        
        const message = `${actorName} ${messages[type]}`;
        
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert([
                {
                    user_id: userId,
                    type: type,
                    actor_id: actorId,
                    target_id: targetId,
                    message: message
                }
            ])
            .select();
            
        if (error) {
            console.error('❌ 创建通知失败:', error);
            return null;
        }
        
        console.log('✅ 通知创建成功:', data[0]);
        return data[0];
    }
    
    // 获取用户资料（用于通知）
    async getUserProfile(userId) {
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('display_name, oc_name, avatar_url')
            .eq('auth0_user_id', userId)
            .single();
            
        return error ? null : data;
    }
    
    // 获取用户通知
    async getUserNotifications(limit = 20) {
        if (!this.currentUserId) return [];
        
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', this.currentUserId)
            .order('created_at', { ascending: false })
            .limit(limit);
            
        if (error) {
            throw new Error('获取通知失败: ' + error.message);
        }
        
        return data || [];
    }
    
    // 获取未读通知数量
    async getUnreadNotificationCount() {
        if (!this.currentUserId) return 0;
        
        const { count, error } = await supabaseAdmin
            .from('notifications')
            .select('id', { count: 'exact' })
            .eq('user_id', this.currentUserId)
            .eq('is_read', false);
            
        if (error) {
            console.error('❌ 获取未读通知数失败:', error);
            return 0;
        }
        
        return count || 0;
    }
    
    // 标记通知为已读
    async markNotificationAsRead(notificationId) {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', this.currentUserId);
            
        if (error) {
            throw new Error('标记通知已读失败: ' + error.message);
        }
    }
    
    // 标记所有通知为已读
    async markAllNotificationsAsRead() {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', this.currentUserId)
            .eq('is_read', false);
            
        if (error) {
            throw new Error('标记所有通知已读失败: ' + error.message);
        }
    }

    // 关注用户
    async followUser(targetUserId) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        if (this.currentUserId === targetUserId) {
            throw new Error('不能关注自己');
        }
        
        const { data, error } = await supabaseAdmin
            .from('follows')
            .insert([
                {
                    follower_id: this.currentUserId,
                    following_id: targetUserId
                }
            ])
            .select();
            
        if (error) {
            throw new Error('关注失败: ' + error.message);
        }
        if (data) {
            try {
                await this.createNotification(targetUserId, 'follow', this.currentUserId);
            } catch (error) {
                console.error('❌ 创建关注通知失败:', error);
                // 不阻止主要操作
            }
        }
        
        return data[0];
    }
    
    // 取消关注
    async unfollowUser(targetUserId) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        const { error } = await supabaseAdmin
            .from('follows')
            .delete()
            .eq('follower_id', this.currentUserId)
            .eq('following_id', targetUserId);
            
        if (error) {
            throw new Error('取消关注失败: ' + error.message);
        }
    }
    
    // 检查是否已关注
    async isFollowing(targetUserId) {
        if (!this.currentUserId) return false;
        
        const { data, error } = await supabaseAdmin
            .from('follows')
            .select('id')
            .eq('follower_id', this.currentUserId)
            .eq('following_id', targetUserId)
            .single();
            
        return !error && data !== null;
    }
    
    // 获取用户的关注统计
    async getUserFollowStats(userId) {
        const [followingCount, followersCount] = await Promise.all([
            // 关注数
            supabaseAdmin
                .from('follows')
                .select('id', { count: 'exact' })
                .eq('follower_id', userId),
                
            // 粉丝数  
            supabaseAdmin
                .from('follows')
                .select('id', { count: 'exact' })
                .eq('following_id', userId)
        ]);
        
        return {
            following: followingCount.count || 0,
            followers: followersCount.count || 0
        };
    }
    
    // ========== 点赞点踩功能 ==========
    
    // 添加反应（点赞/点踩）
    async addReaction(targetUserId, type) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        if (!['like', 'dislike'].includes(type)) {
            throw new Error('无效的反应类型');
        }
        
        const { data, error } = await supabaseAdmin
            .from('reactions')
            .upsert([
                {
                    user_id: this.currentUserId,
                    target_user_id: targetUserId,
                    type: type
                }
            ], {
                onConflict: 'user_id,target_user_id'
            })
            .select();
            
        if (error) {
            throw new Error('操作失败: ' + error.message);
        }
        if (data) {
            try {
                await this.createNotification(targetUserId, type, this.currentUserId);
            } catch (error) {
                console.error('❌ 创建反应通知失败:', error);
            }
        }
        
        return data[0];
    }
    
    // 移除反应
    async removeReaction(targetUserId) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        const { error } = await supabaseAdmin
            .from('reactions')
            .delete()
            .eq('user_id', this.currentUserId)
            .eq('target_user_id', targetUserId);
            
        if (error) {
            throw new Error('移除失败: ' + error.message);
        }
    }
    
    // 获取用户的反应统计
    async getUserReactionStats(userId) {
        const { data, error } = await supabaseAdmin
            .from('reactions')
            .select('type')
            .eq('target_user_id', userId);
            
        if (error) {
            return { likes: 0, dislikes: 0 };
        }
        
        const likes = data.filter(r => r.type === 'like').length;
        const dislikes = data.filter(r => r.type === 'dislike').length;
        
        return { likes, dislikes };
    }
    
    // 获取当前用户对目标用户的反应
    async getCurrentUserReaction(targetUserId) {
        if (!this.currentUserId) return null;
        
        const { data, error } = await supabaseAdmin
            .from('reactions')
            .select('type')
            .eq('user_id', this.currentUserId)
            .eq('target_user_id', targetUserId)
            .single();
            
        return error ? null : data.type;
    }
    
    // ========== 评论功能 ==========
    
    // 发表评论
    async addComment(targetUserId, content) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        if (!content.trim()) {
            throw new Error('评论内容不能为空');
        }
        
        const { data, error } = await supabaseAdmin
            .from('comments')
            .insert([
                {
                    author_id: this.currentUserId,
                    target_user_id: targetUserId,
                    content: content.trim()
                }
            ])
            .select(`
                *,
                user_profiles:author_id (
                    display_name,
                    avatar_url,
                    oc_name
                )
            `);
            
        if (error) {
            throw new Error('发表评论失败: ' + error.message);
        }
        if (data) {
            try {
                await this.createNotification(targetUserId, 'comment', this.currentUserId, data[0].id);
            } catch (error) {
                console.error('❌ 创建评论通知失败:', error);
            }
        }
        return data[0];
    }
    
    // 修改获取评论的方法 - 修复关联查询
    async getUserComments(userId, limit = 50) {
        try {
            console.log('🔍 获取评论，目标用户:', userId);
            
            // 方法1：明确指定关联关系
            const { data, error } = await supabaseAdmin
                .from('comments')
                .select(`
                    *,
                    author_profile:user_profiles!comments_author_id_fkey (
                        display_name,
                        avatar_url,
                        oc_name
                    )
                `)
                .eq('target_user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('❌ 方法1失败:', error);
                
                // 方法2：如果方法1失败，尝试不使用关联查询
                return await this.getUserCommentsWithoutJoin(userId, limit);
            }
            
            console.log('✅ 评论数据:', data);
            return data || [];
            
        } catch (error) {
            console.error('❌ 获取评论失败:', error);
            throw new Error('获取评论失败: ' + error.message);
        }
    }

    async getUserCommentsWithoutJoin(userId, limit = 50) {
        try {
            console.log('🔄 使用备用方法获取评论和回复');
            
            // 获取该用户的所有评论（包括回复）
            const { data: comments, error } = await supabaseAdmin
                .from('comments')
                .select('*')
                .or(`target_user_id.eq.${userId},reply_to_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            if (!comments || comments.length === 0) {
                return [];
            }
            
            // 获取所有相关用户的用户信息（评论作者 + 被回复用户）
            const allUserIds = new Set();
            comments.forEach(comment => {
                allUserIds.add(comment.author_id);
                if (comment.reply_to_id) {
                    allUserIds.add(comment.reply_to_id);
                }
            });
            
            const userIds = Array.from(allUserIds);
            const { data: users, error: usersError } = await supabaseAdmin
                .from('user_profiles')
                .select('auth0_user_id, display_name, avatar_url, oc_name')
                .in('auth0_user_id', userIds);
            
            if (usersError) {
                console.error('❌ 获取用户信息失败:', usersError);
                // 即使获取用户信息失败，也返回评论
                return comments.map(comment => ({
                    ...comment,
                    user_profiles: null,
                    reply_to_user: null
                }));
            }
            
            // 创建用户信息映射
            const userMap = users.reduce((map, user) => {
                map[user.auth0_user_id] = user;
                return map;
            }, {});
            
            // 组织评论结构（主评论 + 回复）
            const mainComments = comments.filter(comment => !comment.parent_id);
            const replies = comments.filter(comment => comment.parent_id);
            
            // 将回复关联到主评论
            const commentMap = new Map();
            mainComments.forEach(comment => {
                commentMap.set(comment.id, {
                    ...comment,
                    user_profiles: userMap[comment.author_id] || null,
                    replies: []
                });
            });
            
            // 添加回复到对应主评论
            replies.forEach(reply => {
                const parentComment = commentMap.get(reply.parent_id);
                if (parentComment) {
                    parentComment.replies.push({
                        ...reply,
                        user_profiles: userMap[reply.author_id] || null,
                        reply_to_user: userMap[reply.reply_to_id] || null
                    });
                }
            });
            
            // 按时间排序回复
            commentMap.forEach(comment => {
                comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
            
            return Array.from(commentMap.values());
            
        } catch (error) {
            console.error('❌ 获取评论失败:', error);
            throw error;
        }
    }

    // 添加回复评论的方法
    async addReply(parentCommentId, targetUserId, replyToUserId, content) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        if (!content.trim()) {
            throw new Error('回复内容不能为空');
        }
        
        const { data, error } = await supabaseClient
            .from('comments')
            .insert([
                {
                    author_id: this.currentUserId,
                    target_user_id: targetUserId,
                    reply_to_id: replyToUserId,
                    parent_id: parentCommentId,
                    content: content.trim()
                }
            ])
            .select();
            
        if (error) {
            throw new Error('回复失败: ' + error.message);
        }
        
        return data[0];
    }
    // 删除评论
    async deleteComment(commentId) {
        if (!this.currentUserId) {
            throw new Error('请先登录');
        }
        
        const { error } = await supabaseAdmin
            .from('comments')
            .delete()
            .eq('id', commentId)
            .eq('author_id', this.currentUserId);
            
        if (error) {
            throw new Error('删除评论失败: ' + error.message);
        }
    }
    // ========== 数据清理方法 ==========
    
    // 删除用户的所有社交数据
    async deleteAllUserData(userId) {
        console.log('🗑️ 开始删除用户社交数据:', userId);
        
        try {
            // 并行删除所有相关数据
            const results = await Promise.allSettled([
                this.deleteUserFollows(userId),
                this.deleteUserReactions(userId),
                this.deleteUserComments(userId)
            ]);
            
            // 检查结果
            const errors = results
                .filter(result => result.status === 'rejected')
                .map(result => result.reason.message);
            
            if (errors.length > 0) {
                console.warn('⚠️ 部分数据删除失败:', errors);
                throw new Error(`部分数据删除失败: ${errors.join('; ')}`);
            }
            
            console.log('✅ 用户社交数据删除完成');
            return true;
            
        } catch (error) {
            console.error('❌ 删除用户社交数据失败:', error);
            throw error;
        }
    }
    
    // 删除用户的关注关系
    async deleteUserFollows(userId) {
        const { error } = await supabaseAdmin
            .from('follows')
            .delete()
            .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
            
        if (error) {
            throw new Error(`删除关注关系失败: ${error.message}`);
        }
        
        console.log('✅ 用户关注关系删除完成');
    }
    
    // 删除用户的点赞点踩记录
    async deleteUserReactions(userId) {
        const { error } = await supabaseAdmin
            .from('reactions')
            .delete()
            .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);
            
        if (error) {
            throw new Error(`删除反应记录失败: ${error.message}`);
        }
        
        console.log('✅ 用户反应记录删除完成');
    }
    
    // 删除用户的评论
    async deleteUserComments(userId) {
        const { error } = await supabaseAdmin
            .from('comments')
            .delete()
            .or(`author_id.eq.${userId},target_user_id.eq.${userId}`);
            
        if (error) {
            throw new Error(`删除评论失败: ${error.message}`);
        }
        
        console.log('✅ 用户评论删除完成');
    }
    
    // 获取用户数据统计（用于确认删除）
    async getUserDataStats(userId) {
        try {
            const [
                followsCount,
                reactionsGivenCount,
                reactionsReceivedCount,
                commentsWrittenCount,
                commentsReceivedCount
            ] = await Promise.all([
                // 关注关系数量
                supabaseAdmin
                    .from('follows')
                    .select('id', { count: 'exact' })
                    .or(`follower_id.eq.${userId},following_id.eq.${userId}`),
                    
                // 给出的反应数量
                supabaseAdmin
                    .from('reactions')
                    .select('id', { count: 'exact' })
                    .eq('user_id', userId),
                    
                // 收到的反应数量  
                supabaseAdmin
                    .from('reactions')
                    .select('id', { count: 'exact' })
                    .eq('target_user_id', userId),
                    
                // 写过的评论数量
                supabaseAdmin
                    .from('comments')
                    .select('id', { count: 'exact' })
                    .eq('author_id', userId),
                    
                // 收到的评论数量
                supabaseAdmin
                    .from('comments')
                    .select('id', { count: 'exact' })
                    .eq('target_user_id', userId)
            ]);
            
            return {
                follows: followsCount.count || 0,
                reactionsGiven: reactionsGivenCount.count || 0,
                reactionsReceived: reactionsReceivedCount.count || 0,
                commentsWritten: commentsWrittenCount.count || 0,
                commentsReceived: commentsReceivedCount.count || 0
            };
            
        } catch (error) {
            console.error('❌ 获取用户数据统计失败:', error);
            return null;
        }
    }
}

// 创建全局实例
const socialManager = new SocialManager();

async function initializeSocialFeatures(targetUserId, isOtherUser) {
    if (!targetUserId) return;
    
    try {
        // 确保Auth客户端已初始化
        if (typeof nbuAuthClient === 'undefined') {
            console.log("🔄 初始化Auth客户端...");
            await initializeNBUAuth();
        }
        
        // 检查当前用户登录状态
        const isAuthenticated = await nbuAuthClient.isAuthenticated();
        
        if (isAuthenticated) {
            // 获取当前用户信息
            const currentUser = await nbuAuthClient.getUser();
            const currentUserProfile = await handleUserProfile(currentUser);
            
            // 设置当前用户到社交管理器
            socialManager.setCurrentUser(currentUserProfile.auth0_user_id);
            window.currentUserProfile = currentUserProfile; // 保存到全局
            
            console.log('✅ 当前用户已设置:', currentUserProfile.auth0_user_id);
        } else {
            console.log('⚠️ 用户未登录，社交功能受限');
        }
        
        // 加载社交统计
        await loadSocialStats(targetUserId);
        
        // 如果是查看他人资料且用户已登录，初始化关注按钮
        if (isOtherUser && isAuthenticated) {
            await initializeFollowButton(targetUserId);
        } else if (isOtherUser) {
            // 用户未登录，显示登录提示
            showFollowLoginPrompt();
        }
        
    } catch (error) {
        console.error('❌ 初始化社交功能失败:', error);
    }
}

// 显示关注登录提示
function showFollowLoginPrompt() {
    const followBtn = document.getElementById('follow-btn');
    const followText = document.getElementById('follow-text');
    
    if (followBtn && followText) {
        followText.textContent = '登录后关注';
        followBtn.onclick = () => {
            nbuHandleLogin();
        };
    }
}

// 加载社交统计
async function loadSocialStats(userId) {
    try {
        console.log('📊 加载社交统计:', userId);
        
        const [followStats, reactionStats] = await Promise.all([
            socialManager.getUserFollowStats(userId),
            socialManager.getUserReactionStats(userId)
        ]);
        
        // 更新UI
        document.getElementById('followers-count').textContent = followStats.followers;
        document.getElementById('following-count').textContent = followStats.following;
        document.getElementById('likes-count').textContent = reactionStats.likes;
        
        console.log('✅ 社交统计加载完成:', { followStats, reactionStats });
        
    } catch (error) {
        console.error('❌ 加载社交统计失败:', error);
        // 设置默认值
        document.getElementById('followers-count').textContent = '0';
        document.getElementById('following-count').textContent = '0';
        document.getElementById('likes-count').textContent = '0';
    }
}

// 初始化关注按钮
async function initializeFollowButton(targetUserId) {
    const followBtn = document.getElementById('follow-btn');
    const followText = document.getElementById('follow-text');
    
    if (!followBtn || !followText) return;
    
    try {
        followBtn.disabled = true;
        followText.textContent = '检查中';
        followText.classList.add('nbu-loading');
        
        const isFollowing = await socialManager.isFollowing(targetUserId);
        
        // 更新按钮状态
        updateFollowButton(followBtn, followText, isFollowing);
        followBtn.disabled = false;
        
        console.log(`✅ 关注状态: ${isFollowing ? '已关注' : '未关注'}`);
        
    } catch (error) {
        console.error('❌ 检查关注状态失败:', error);
        followText.textContent = '加载失败';
        followBtn.disabled = false;
    }
}

// 更新关注按钮状态
function updateFollowButton(button, textElement, isFollowing) {
    textElement.classList.remove('nbu-loading');
    
    if (isFollowing) {
        button.classList.add('following');
        textElement.textContent = '已关注';
    } else {
        button.classList.remove('following');
        textElement.textContent = '关注';
    }
}

// 切换关注状态 - 修复版
async function toggleFollow(targetUserId) {
    console.log('🔍 开始关注操作:', { targetUserId, currentUser: socialManager.currentUserId });
    
    const followBtn = document.getElementById('follow-btn');
    const followText = document.getElementById('follow-text');
    
    if (!followBtn || followBtn.disabled) return;
    
    // 详细检查登录状态
    if (!socialManager.currentUserId) {
        console.log('❌ 用户未登录，尝试重新初始化...');
        
        try {
            const isAuthenticated = await nbuAuthClient.isAuthenticated();
            if (isAuthenticated) {
                const currentUser = await nbuAuthClient.getUser();
                const currentUserProfile = await handleUserProfile(currentUser);
                socialManager.setCurrentUser(currentUserProfile.auth0_user_id);
                console.log('✅ 重新获取用户成功:', socialManager.currentUserId);
            } else {
                alert('请先登录后再执行此操作');
                followText.textContent = '请先登录';
                return;
            }
        } catch (error) {
            console.error('❌ 重新初始化失败:', error);
            alert('请先登录后再执行此操作');
            followText.textContent = '请先登录';
            return;
        }
    }
    
    // 检查是否关注自己
    if (socialManager.currentUserId === targetUserId) {
        alert('不能关注自己哦！');
        return;
    }
    
    try {
        followBtn.disabled = true;
        followText.textContent = '处理中';
        followText.classList.add('nbu-loading');
        
        console.log('🔄 检查当前关注状态...');
        const isCurrentlyFollowing = await socialManager.isFollowing(targetUserId);
        console.log('当前关注状态:', isCurrentlyFollowing);
        
        if (isCurrentlyFollowing) {
            // 取消关注
            console.log('🔄 执行取消关注...');
            await socialManager.unfollowUser(targetUserId);
            updateFollowButton(followBtn, followText, false);
            console.log('✅ 取消关注成功');
        } else {
            // 关注
            console.log('🔄 执行关注...');
            await socialManager.followUser(targetUserId);
            updateFollowButton(followBtn, followText, true);
            console.log('✅ 关注成功');
        }
        
        // 更新统计数字
        console.log('🔄 更新社交统计...');
        await loadSocialStats(targetUserId);
        
    } catch (error) {
        console.error('❌ 关注操作失败:', error);
        alert('操作失败: ' + error.message);
        followText.textContent = '操作失败';
    } finally {
        followBtn.disabled = false;
        followText.classList.remove('nbu-loading');
    }
}

// 全局函数
window.toggleFollow = toggleFollow;
window.initializeSocialFeatures = initializeSocialFeatures;
window.initializeFollowButton = initializeFollowButton;

// 点赞点踩功能UI逻辑
async function initializeReactionButtons(targetUserId) {
    if (!targetUserId || !window.currentUserProfile) return;
    
    try {
        console.log('🎯 初始化点赞点踩按钮:', targetUserId);
        
        // 获取当前用户的反应状态
        const currentReaction = await socialManager.getCurrentUserReaction(targetUserId);
        
        // 更新按钮状态
        updateReactionButtons(currentReaction);
        
        console.log(`✅ 当前反应状态: ${currentReaction || '无'}`);
        
    } catch (error) {
        console.error('❌ 初始化反应按钮失败:', error);
    }
}

// 更新反应按钮状态
function updateReactionButtons(currentReaction) {
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');
    
    if (!likeBtn || !dislikeBtn) return;
    
    // 重置所有按钮状态
    likeBtn.classList.remove('active', 'pulse');
    dislikeBtn.classList.remove('active', 'pulse');
    likeBtn.disabled = false;
    dislikeBtn.disabled = false;
    
    // 设置当前激活的按钮
    if (currentReaction === 'like') {
        likeBtn.classList.add('active', 'pulse');
    } else if (currentReaction === 'dislike') {
        dislikeBtn.classList.add('active', 'pulse');
    }
}

// 处理反应操作
async function handleReaction(type, targetUserId) {
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');
    
    if (!likeBtn || !dislikeBtn || likeBtn.disabled || dislikeBtn.disabled) return;
    
    try {
        // 禁用按钮防止重复点击
        likeBtn.disabled = true;
        dislikeBtn.disabled = true;
        
        console.log(`🎯 处理反应: ${type} 用户: ${targetUserId}`);
        
        // 获取当前反应状态
        const currentReaction = await socialManager.getCurrentUserReaction(targetUserId);
        
        if (currentReaction === type) {
            // 如果点击的是已激活的按钮，则取消反应
            await socialManager.removeReaction(targetUserId);
            console.log('✅ 取消反应成功');
            updateReactionButtons(null);
        } else {
            // 否则设置新的反应
            await socialManager.addReaction(targetUserId, type);
            console.log(`✅ ${type === 'like' ? '点赞' : '点踩'}成功`);
            updateReactionButtons(type);
        }
        
        // 更新统计数字
        await updateReactionStats(targetUserId);
        
    } catch (error) {
        console.error('❌ 反应操作失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        // 重新启用按钮
        likeBtn.disabled = false;
        dislikeBtn.disabled = false;
    }
}

// 更新反应统计数字
async function updateReactionStats(targetUserId) {
    try {
        const reactionStats = await socialManager.getUserReactionStats(targetUserId);
        
        // 更新UI
        document.getElementById('likes-count').textContent = reactionStats.likes;
        document.getElementById('dislikes-count').textContent = reactionStats.dislikes;
        document.getElementById('like-count').textContent = reactionStats.likes;
        document.getElementById('dislike-count').textContent = reactionStats.dislikes;
        
        console.log('✅ 反应统计更新:', reactionStats);
        
    } catch (error) {
        console.error('❌ 更新反应统计失败:', error);
    }
}

// 在loadSocialStats函数中集成反应统计
async function loadSocialStats(userId) {
    try {
        console.log('📊 加载社交统计:', userId);
        
        const [followStats, reactionStats] = await Promise.all([
            socialManager.getUserFollowStats(userId),
            socialManager.getUserReactionStats(userId)
        ]);
        
        // 更新UI
        document.getElementById('followers-count').textContent = followStats.followers;
        document.getElementById('following-count').textContent = followStats.following;
        document.getElementById('likes-count').textContent = reactionStats.likes;
        document.getElementById('dislikes-count').textContent = reactionStats.dislikes;
        
        // 更新按钮上的计数
        const likeCount = document.getElementById('like-count');
        const dislikeCount = document.getElementById('dislike-count');
        if (likeCount) likeCount.textContent = reactionStats.likes;
        if (dislikeCount) dislikeCount.textContent = reactionStats.dislikes;
        
        console.log('✅ 社交统计加载完成:', { followStats, reactionStats });
        
    } catch (error) {
        console.error('❌ 加载社交统计失败:', error);
        // 设置默认值
        document.getElementById('followers-count').textContent = '0';
        document.getElementById('following-count').textContent = '0';
        document.getElementById('likes-count').textContent = '0';
        document.getElementById('dislikes-count').textContent = '0';
    }
}

// 全局函数
window.handleReaction = handleReaction;

// 评论功能UI逻辑
async function initializeCommentsSection(targetUserId) {
    if (!targetUserId) return;
    
    try {
        console.log('💬 初始化评论区域:', targetUserId);
        
        // 初始化评论输入框
        initializeCommentInput();
        
        // 加载评论列表
        await loadComments(targetUserId);
        
    } catch (error) {
        console.error('❌ 初始化评论区域失败:', error);
        showCommentsError('加载评论失败');
    }
}

// 初始化评论输入框
function initializeCommentInput() {
    const commentInput = document.getElementById('comment-input');
    const commentChars = document.getElementById('comment-chars');
    const submitBtn = document.getElementById('submit-comment');
    
    if (!commentInput || !commentChars || !submitBtn) return;
    
    // 输入监听
    commentInput.addEventListener('input', function() {
        const length = this.value.length;
        commentChars.textContent = length;
        
        // 字符计数警告
        if (length > 450) {
            commentChars.classList.add('warning');
        } else {
            commentChars.classList.remove('warning');
        }
        
        // 控制提交按钮状态
        submitBtn.disabled = length === 0 || length > 500;
    });
    
    // 回车键提交（Ctrl+Enter）
    commentInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const targetUserId = this.closest('.nbu-comments-section')
                .querySelector('[onclick^="submitComment"]')
                .getAttribute('onclick')
                .match(/'([^']+)'/)[1];
            submitComment(targetUserId);
        }
    });
}

// 加载评论列表
async function loadComments(targetUserId) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    try {
        commentsList.innerHTML = `
            <div class="nbu-comments-loading">
                <div class="nbu-loading-spinner"></div>
                <span>加载评论中...</span>
            </div>
        `;
        
        const comments = await socialManager.getUserComments(targetUserId);
        
        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="nbu-empty-comments">
                    <div class="nbu-empty-icon">💬</div>
                    <h4>还没有评论</h4>
                    <p>成为第一个评论的人吧！</p>
                </div>
            `;
        } else {
            commentsList.innerHTML = comments.map(comment => createCommentHTML(comment)).join('');
        }
        
        // 更新评论计数
        updateCommentsCount(comments.length);
        
        console.log(`✅ 加载评论成功: ${comments.length} 条评论`);
        
    } catch (error) {
        console.error('❌ 加载评论失败:', error);
        showCommentsError('加载评论失败: ' + error.message);
    }
}

function createCommentHTML(comment) {
    const isOwnComment = window.currentUserProfile && 
                        comment.author_id === window.currentUserProfile.auth0_user_id;
    const authorName = comment.user_profiles?.oc_name || 
                      comment.user_profiles?.display_name || 
                      '匿名用户';
    const avatarUrl = comment.user_profiles?.avatar_url || getDefaultAvatar();
    const timeAgo = getTimeAgo(comment.created_at);
    const isReply = !!comment.parent_id;
    // 如果是回复，显示被回复的用户
    const replyToInfo = comment.is_reply && comment.reply_to_user ? 
        `<span class="nbu-reply-to">回复 <strong>${comment.reply_to_user.oc_name || comment.reply_to_user.display_name || '匿名用户'}</strong></span>` : 
        '';
    const userProfileLink = isOwnComment ? 
        '/profile/' : // 自己的主页（无参数）
        `/profile/?user=${encodeURIComponent(comment.author_id)}`;
    
    return `
        <div class="nbu-comment-item ${isOwnComment ? 'nbu-comment-own' : ''} ${isReply ? 'nbu-comment-reply' : ''}">
            <div class="nbu-comment-header">
                <a href="${userProfileLink}" 
                   class="nbu-comment-user-link ${isOwnComment ? 'nbu-comment-self' : ''}">
                    <img src="${avatarUrl}" 
                         alt="${authorName}" 
                         class="nbu-comment-avatar"
                         onerror="this.src='${getDefaultAvatar()}'">
                    <span class="nbu-comment-author">${authorName}</span>
                    ${replyToInfo}
                </a>
                <a href="${userProfileLink}" 
                   class="nbu-comment-user-link ${isOwnComment ? 'nbu-comment-self' : ''}">
                </a>
                <span class="nbu-comment-time">${timeAgo}</span>
            </div>
            <div class="nbu-comment-content">${escapeHtml(comment.content)}</div>
            ${!isReply ? `
                <button class="nbu-comment-reply-btn" onclick="showReplyForm('${comment.id}', '${comment.author_id}', '${escapeHtml(authorName)}')">
                    💬 回复
                </button>
            ` : ''}
            ${isOwnComment ? `
                <div class="nbu-comment-actions">
                    <button class="nbu-comment-delete" onclick="deleteComment('${comment.id}')">
                        删除
                    </button>
                </div>
            ` : ''}

            <!-- 回复表单 -->
            <div id="reply-form-${comment.id}" class="nbu-reply-form" style="display: none;">
                <div class="nbu-reply-input-container">
                    <textarea 
                        id="reply-input-${comment.id}" 
                        placeholder="回复 ${authorName}..." 
                        rows="2"
                        maxlength="300"
                    ></textarea>
                    <div class="nbu-reply-actions">
                        <div class="nbu-reply-counter">
                            <span id="reply-chars-${comment.id}">0</span>/300
                        </div>
                        <button class="nbu-reply-cancel" onclick="hideReplyForm('${comment.id}')">取消</button>
                        <button class="nbu-reply-submit" onclick="submitReply('${comment.id}', '${comment.target_user_id}', '${comment.author_id}')">
                            回复
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 回复列表 -->
            ${comment.replies && comment.replies.length > 0 ? `
                <div class="nbu-replies-list">
                    ${comment.replies.map(reply => createCommentHTML(reply, true)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// 提交评论
async function submitComment(targetUserId) {
    const commentInput = document.getElementById('comment-input');
    const submitBtn = document.getElementById('submit-comment');
    
    if (!commentInput || !submitBtn || submitBtn.disabled) return;
    
    const content = commentInput.value.trim();
    if (!content) return;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = '发表中...';
        
        console.log('💬 提交评论:', { targetUserId, content });
        
        await socialManager.addComment(targetUserId, content);
        
        // 清空输入框
        commentInput.value = '';
        document.getElementById('comment-chars').textContent = '0';
        document.getElementById('comment-chars').classList.remove('warning');
        
        // 重新加载评论列表
        await loadComments(targetUserId);
        
        console.log('✅ 评论发表成功');
        
    } catch (error) {
        console.error('❌ 发表评论失败:', error);
        alert('发表评论失败: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '发表评论';
    }
}

// 删除评论
async function deleteComment(commentId) {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
        console.log('🗑️ 删除评论:', commentId);
        
        await socialManager.deleteComment(commentId);
        
        // 重新加载评论列表
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('user');
        await loadComments(targetUserId);
        
        console.log('✅ 评论删除成功');
        
    } catch (error) {
        console.error('❌ 删除评论失败:', error);
        alert('删除评论失败: ' + error.message);
    }
}

// 更新评论计数
function updateCommentsCount(count) {
    const countElement = document.getElementById('comments-count');
    if (countElement) {
        countElement.textContent = `${count} 条评论`;
    }
}

// 显示评论错误
function showCommentsError(message) {
    const commentsList = document.getElementById('comments-list');
    if (commentsList) {
        commentsList.innerHTML = `
            <div class="nbu-empty-comments">
                <div class="nbu-empty-icon">❌</div>
                <h4>加载失败</h4>
                <p>${message}</p>
                <button onclick="location.reload()" class="nbu-comment-submit" style="margin-top: 1rem;">
                    重新加载
                </button>
            </div>
        `;
    }
}

// 工具函数：时间显示
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
    
    return time.toLocaleDateString('zh-CN');
}

// 工具函数：HTML转义
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 全局函数
window.submitComment = submitComment;
window.deleteComment = deleteComment;

// 通知中心功能
class NotificationCenter {
    constructor() {
        this.isOpen = false;
        this.isInitialized = false;
    }
    
    // 初始化通知中心
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // 加载未读通知数量
            await this.updateNotificationBadge();
            
            // 设置实时监听
            this.setupRealtimeListener();
            
            this.isInitialized = true;
            console.log('✅ 通知中心初始化完成');
            
        } catch (error) {
            console.error('❌ 通知中心初始化失败:', error);
        }
    }
    
    // 更新通知徽章
    async updateNotificationBadge() {
        try {
            const unreadCount = await socialManager.getUnreadNotificationCount();
            const badge = document.getElementById('notification-badge');
            
            if (badge) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            }
            
        } catch (error) {
            console.error('❌ 更新通知徽章失败:', error);
        }
    }
    
    // 设置实时监听
    setupRealtimeListener() {
        if (!window.currentUserProfile) return;
        
        const subscription = supabaseAdmin
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${window.currentUserProfile.auth0_user_id}`
                },
                (payload) => {
                    console.log('🔔 收到新通知:', payload);
                    this.handleNewNotification(payload.new);
                }
            )
            .subscribe();
            
        console.log('✅ 通知实时监听已启动');
    }
    
    // 处理新通知
    handleNewNotification(notification) {
        // 更新徽章
        this.updateNotificationBadge();
        
        // 如果通知中心打开，刷新列表
        if (this.isOpen) {
            this.loadNotifications();
        }
        
        // 显示桌面通知（如果浏览器支持）
        this.showDesktopNotification(notification);
    }
    
    // 显示桌面通知
    showDesktopNotification(notification) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification('NBU社区', {
                body: notification.message,
                icon: '/images/logo.png'
            });
        } else if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    // 切换通知中心显示
    async toggle() {
        const center = document.getElementById('notification-center');
        if (!center) return;
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            center.classList.add('show');
            await this.loadNotifications();
        } else {
            center.classList.remove('show');
        }
    }
    
    // 加载通知列表
    async loadNotifications() {
        const center = document.getElementById('notification-center');
        if (!center) return;
        
        try {
            center.innerHTML = `
                <div class="nbu-notification-header">
                    <h5>通知</h5>
                    <button class="nbu-mark-all-read" onclick="notificationCenter.markAllAsRead()">
                        标记全部已读
                    </button>
                </div>
                <div class="nbu-notification-list">
                    <div class="nbu-notification-item">
                        <div class="nbu-loading-spinner"></div>
                        <span>加载中...</span>
                    </div>
                </div>
            `;
            
            const notifications = await socialManager.getUserNotifications();
            
            if (notifications.length === 0) {
                center.innerHTML = `
                    <div class="nbu-notification-header">
                        <h5>通知</h5>
                    </div>
                    <div class="nbu-notification-empty">
                        <div class="nbu-empty-icon">🔔</div>
                        <p>还没有通知</p>
                    </div>
                `;
            } else {
                const listHTML = notifications.map(notification => 
                    this.createNotificationHTML(notification)
                ).join('');
                
                center.innerHTML = `
                    <div class="nbu-notification-header">
                        <h5>通知</h5>
                        <button class="nbu-mark-all-read" onclick="notificationCenter.markAllAsRead()">
                            标记全部已读
                        </button>
                    </div>
                    <div class="nbu-notification-list">
                        ${listHTML}
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('❌ 加载通知失败:', error);
            center.innerHTML = `
                <div class="nbu-notification-header">
                    <h5>通知</h5>
                </div>
                <div class="nbu-notification-empty">
                    <div class="nbu-empty-icon">❌</div>
                    <p>加载失败</p>
                    <button onclick="notificationCenter.loadNotifications()" class="nbu-mark-all-read">
                        重试
                    </button>
                </div>
            `;
        }
    }
    
    // 创建通知HTML
    createNotificationHTML(notification) {
        const timeAgo = getTimeAgo(notification.created_at);
        const typeClass = `nbu-notification-type ${notification.type}`;
        
        return `
            <div class="nbu-notification-item ${notification.is_read ? '' : 'unread'}" 
                 onclick="notificationCenter.handleNotificationClick('${notification.id}')">
                <span class="${typeClass}"></span>
                <div class="nbu-notification-content">
                    <div class="nbu-notification-message">${notification.message}</div>
                    <div class="nbu-notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }
    
    // 处理通知点击
    async handleNotificationClick(notificationId) {
        try {
            // 标记为已读
            await socialManager.markNotificationAsRead(notificationId);
            
            // 更新徽章
            await this.updateNotificationBadge();
            
            // 刷新通知列表
            await this.loadNotifications();
            
            // 关闭通知中心
            this.toggle();
            
        } catch (error) {
            console.error('❌ 处理通知点击失败:', error);
        }
    }
    
    // 标记所有为已读
    async markAllAsRead() {
        try {
            await socialManager.markAllNotificationsAsRead();
            await this.updateNotificationBadge();
            await this.loadNotifications();
            
            console.log('✅ 所有通知标记为已读');
            
        } catch (error) {
            console.error('❌ 标记所有通知已读失败:', error);
            alert('操作失败: ' + error.message);
        }
    }
}

// 创建全局实例
const notificationCenter = new NotificationCenter();

// 全局函数
window.toggleNotificationCenter = () => notificationCenter.toggle();
window.notificationCenter = notificationCenter;

// 在用户登录后初始化通知中心
async function initializeNotificationCenter() {
    await notificationCenter.initialize();
}

// 回复评论功能
function showReplyForm(commentId, replyToUserId, replyToName) {
    // 隐藏所有其他回复表单
    document.querySelectorAll('.nbu-reply-form').forEach(form => {
        form.style.display = 'none';
    });
    
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    
    if (replyForm && replyInput) {
        replyForm.style.display = 'block';
        replyInput.focus();
        replyInput.setAttribute('data-reply-to', replyToUserId);
        replyInput.setAttribute('data-reply-to-name', replyToName);
        
        // 初始化输入监听
        initializeReplyInput(commentId);
    }
}

function hideReplyForm(commentId) {
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        
        // 清空输入框
        const replyInput = document.getElementById(`reply-input-${commentId}`);
        if (replyInput) {
            replyInput.value = '';
            document.getElementById(`reply-chars-${commentId}`).textContent = '0';
            document.getElementById(`reply-chars-${commentId}`).classList.remove('warning');
        }
    }
}

function initializeReplyInput(commentId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    const replyChars = document.getElementById(`reply-chars-${commentId}`);
    
    if (!replyInput || !replyChars) return;
    
    replyInput.addEventListener('input', function() {
        const length = this.value.length;
        replyChars.textContent = length;
        
        if (length > 250) {
            replyChars.classList.add('warning');
        } else {
            replyChars.classList.remove('warning');
        }
    });
    
    // 回车键提交
    replyInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const targetUserId = this.closest('.nbu-comment-item')
                .querySelector('[onclick^="submitReply"]')
                .getAttribute('onclick')
                .match(/'([^']+)'/)[2];
            submitReply(commentId, targetUserId, this.getAttribute('data-reply-to'));
        }
    });
}

async function submitReply(parentCommentId, targetUserId, replyToUserId) {
    const replyInput = document.getElementById(`reply-input-${parentCommentId}`);
    const submitBtn = document.querySelector(`#reply-form-${parentCommentId} .nbu-reply-submit`);
    
    if (!replyInput || !submitBtn || submitBtn.disabled) return;
    
    const content = replyInput.value.trim();
    if (!content) return;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = '回复中...';
        
        console.log('💬 提交回复:', { parentCommentId, targetUserId, replyToUserId, content });
        
        await socialManager.addReply(parentCommentId, targetUserId, replyToUserId, content);
        
        // 隐藏回复表单
        hideReplyForm(parentCommentId);
        
        // 重新加载评论列表
        await loadComments(targetUserId);
        
        console.log('✅ 回复成功');
        
    } catch (error) {
        console.error('❌ 回复失败:', error);
        alert('回复失败: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '回复';
    }
}

// 全局函数
window.showReplyForm = showReplyForm;
window.hideReplyForm = hideReplyForm;
window.submitReply = submitReply;