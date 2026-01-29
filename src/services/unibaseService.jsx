// src/services/unibaseService.js - Unibase Long-Term Memory Integration

/**
 * Unibase Service for AstroVision
 * Handles all persistent storage operations using window.storage API
 * Stores user research history, preferences, and community intelligence
 */

class UnibaseService {
  constructor() {
    this.storage = typeof window !== 'undefined' ? window.storage : null;
    this.userId = null;
  }

  /**
   * Initialize Unibase with user ID
   */
  async initialize(userId) {
    if (!this.storage) {
      console.error('❌ Unibase storage not available');
      return false;
    }
    
    this.userId = userId;
    console.log('✅ Unibase initialized for user:', userId);
    
    // Initialize user profile if it doesn't exist
    await this.initializeUserProfile();
    
    return true;
  }

  /**
   * Create initial user profile in Unibase
   */
  async initializeUserProfile() {
    const profileKey = `user:${this.userId}:profile`;
    
    try {
      const existing = await this.storage.get(profileKey);
      
      if (!existing) {
        const initialProfile = {
          userId: this.userId,
          createdAt: Date.now(),
          totalDiscoveries: 0,
          totalVotes: 0,
          researchInterests: [],
          expertiseLevel: 'beginner',
          lastActive: Date.now()
        };
        
        await this.storage.set(profileKey, JSON.stringify(initialProfile));
        console.log('✅ User profile created');
      }
    } catch (error) {
      console.error('❌ Error initializing profile:', error);
    }
  }

  // ==================== USER PROFILE ====================

  /**
   * Get user profile
   */
  async getUserProfile() {
    if (!this.userId) return null;
    
    try {
      const result = await this.storage.get(`user:${this.userId}:profile`);
      return result ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates) {
    if (!this.userId) return false;
    
    try {
      const profile = await this.getUserProfile() || {};
      const updated = {
        ...profile,
        ...updates,
        lastActive: Date.now()
      };
      
      await this.storage.set(
        `user:${this.userId}:profile`,
        JSON.stringify(updated)
      );
      
      console.log('✅ Profile updated');
      return true;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return false;
    }
  }

  // ==================== DISCOVERY HISTORY ====================

  /**
   * Save a discovery to user's history
   */
  async saveDiscovery(discovery) {
    if (!this.userId) return false;
    
    try {
      const discoveryId = `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const key = `user:${this.userId}:discoveries:${discoveryId}`;
      
      const discoveryData = {
        id: discoveryId,
        timestamp: Date.now(),
        objectType: discovery.objectType || 'unknown',
        title: discovery.title || 'Untitled Discovery',
        description: discovery.description || '',
        aiAnalysis: discovery.aiAnalysis || '',
        imageData: discovery.imageData || null,
        userRating: discovery.userRating || 0,
        tags: discovery.tags || []
      };
      
      await this.storage.set(key, JSON.stringify(discoveryData));
      
      // Update total discoveries count
      const profile = await this.getUserProfile();
      await this.updateUserProfile({
        totalDiscoveries: (profile?.totalDiscoveries || 0) + 1
      });
      
      // Update research interests
      await this.updateResearchInterests(discovery.objectType);
      
      console.log('✅ Discovery saved:', discoveryId);
      return discoveryId;
    } catch (error) {
      console.error('❌ Error saving discovery:', error);
      return null;
    }
  }

  /**
   * Get user's discovery history
   */
  async getDiscoveryHistory(limit = 50) {
    if (!this.userId) return [];
    
    try {
      const prefix = `user:${this.userId}:discoveries:`;
      const result = await this.storage.list(prefix);
      
      if (!result || !result.keys || result.keys.length === 0) {
        return [];
      }
      
      // Get all discoveries
      const discoveries = [];
      for (const key of result.keys.slice(0, limit)) {
        try {
          const data = await this.storage.get(key);
          if (data && data.value) {
            discoveries.push(JSON.parse(data.value));
          }
        } catch (err) {
          console.error('Error loading discovery:', err);
        }
      }
      
      // Sort by timestamp (newest first)
      discoveries.sort((a, b) => b.timestamp - a.timestamp);
      
      return discoveries;
    } catch (error) {
      console.error('❌ Error getting discovery history:', error);
      return [];
    }
  }

  /**
   * Get discoveries by object type
   */
  async getDiscoveriesByType(objectType) {
    const allDiscoveries = await this.getDiscoveryHistory(100);
    return allDiscoveries.filter(d => d.objectType === objectType);
  }

  // ==================== RESEARCH INTERESTS ====================

  /**
   * Update research interests based on discoveries
   */
  async updateResearchInterests(objectType) {
    if (!this.userId || !objectType) return;
    
    try {
      const profile = await this.getUserProfile();
      const interests = profile?.researchInterests || [];
      
      // Find or create interest
      const existing = interests.find(i => i.topic === objectType);
      
      if (existing) {
        existing.count++;
        existing.lastInteraction = Date.now();
        existing.confidence = Math.min(existing.confidence + 5, 100);
      } else {
        interests.push({
          topic: objectType,
          count: 1,
          confidence: 10,
          firstInteraction: Date.now(),
          lastInteraction: Date.now()
        });
      }
      
      // Sort by count
      interests.sort((a, b) => b.count - a.count);
      
      // Keep top 20 interests
      const topInterests = interests.slice(0, 20);
      
      await this.updateUserProfile({ researchInterests: topInterests });
      
      console.log('✅ Research interests updated');
    } catch (error) {
      console.error('❌ Error updating interests:', error);
    }
  }

  /**
   * Get top research interests
   */
  async getTopInterests(limit = 5) {
    const profile = await this.getUserProfile();
    const interests = profile?.researchInterests || [];
    return interests.slice(0, limit);
  }

  // ==================== VOTING HISTORY ====================

  /**
   * Save voting behavior
   */
  async saveVote(voteData) {
    if (!this.userId) return false;
    
    try {
      const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const key = `user:${this.userId}:votes:${voteId}`;
      
      const vote = {
        id: voteId,
        timestamp: Date.now(),
        proposalId: voteData.proposalId,
        proposalType: voteData.proposalType,
        proposalTitle: voteData.proposalTitle,
        voteChoice: voteData.voteChoice, // 'for' or 'against'
        outcome: voteData.outcome || 'pending'
      };
      
      await this.storage.set(key, JSON.stringify(vote));
      
      // Update total votes
      const profile = await this.getUserProfile();
      await this.updateUserProfile({
        totalVotes: (profile?.totalVotes || 0) + 1
      });
      
      console.log('✅ Vote saved:', voteId);
      return voteId;
    } catch (error) {
      console.error('❌ Error saving vote:', error);
      return null;
    }
  }

  /**
   * Get voting history
   */
  async getVotingHistory(limit = 50) {
    if (!this.userId) return [];
    
    try {
      const prefix = `user:${this.userId}:votes:`;
      const result = await this.storage.list(prefix);
      
      if (!result || !result.keys || result.keys.length === 0) {
        return [];
      }
      
      const votes = [];
      for (const key of result.keys.slice(0, limit)) {
        try {
          const data = await this.storage.get(key);
          if (data && data.value) {
            votes.push(JSON.parse(data.value));
          }
        } catch (err) {
          console.error('Error loading vote:', err);
        }
      }
      
      votes.sort((a, b) => b.timestamp - a.timestamp);
      return votes;
    } catch (error) {
      console.error('❌ Error getting voting history:', error);
      return [];
    }
  }

  /**
   * Get voting patterns (what types of proposals user supports)
   */
  async getVotingPatterns() {
    const votes = await this.getVotingHistory();
    
    const patterns = {
      totalVotes: votes.length,
      forVotes: votes.filter(v => v.voteChoice === 'for').length,
      againstVotes: votes.filter(v => v.voteChoice === 'against').length,
      byType: {}
    };
    
    // Group by proposal type
    votes.forEach(vote => {
      if (!patterns.byType[vote.proposalType]) {
        patterns.byType[vote.proposalType] = { for: 0, against: 0 };
      }
      
      if (vote.voteChoice === 'for') {
        patterns.byType[vote.proposalType].for++;
      } else {
        patterns.byType[vote.proposalType].against++;
      }
    });
    
    return patterns;
  }

  // ==================== AI CONVERSATIONS ====================

  /**
   * Save AI conversation
   */
  async saveConversation(conversation) {
    if (!this.userId) return false;
    
    try {
      const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const key = `user:${this.userId}:conversations:${convId}`;
      
      const convData = {
        id: convId,
        timestamp: Date.now(),
        question: conversation.question,
        answer: conversation.answer,
        context: conversation.context || '',
        topicTags: conversation.topicTags || [],
        sentiment: conversation.sentiment || 'neutral'
      };
      
      await this.storage.set(key, JSON.stringify(convData));
      
      console.log('✅ Conversation saved:', convId);
      return convId;
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
      return null;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(limit = 20) {
    if (!this.userId) return [];
    
    try {
      const prefix = `user:${this.userId}:conversations:`;
      const result = await this.storage.list(prefix);
      
      if (!result || !result.keys || result.keys.length === 0) {
        return [];
      }
      
      const conversations = [];
      for (const key of result.keys.slice(0, limit)) {
        try {
          const data = await this.storage.get(key);
          if (data && data.value) {
            conversations.push(JSON.parse(data.value));
          }
        } catch (err) {
          console.error('Error loading conversation:', err);
        }
      }
      
      conversations.sort((a, b) => b.timestamp - a.timestamp);
      return conversations;
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Get recent context for AI (last 5 conversations)
   */
  async getRecentContext() {
    const conversations = await getConversationHistory(5);
    return conversations.map(c => ({
      question: c.question,
      answer: c.answer,
      timestamp: c.timestamp
    }));
  }

  // ==================== COMMUNITY DATA (SHARED) ====================

  /**
   * Save community trending topic
   */
  async saveTrendingTopic(topic, weekNumber) {
    try {
      const key = `community:trending:week_${weekNumber}:${topic.toLowerCase().replace(/\s+/g, '_')}`;
      
      const existing = await this.storage.get(key, true); // shared = true
      const currentVotes = existing ? JSON.parse(existing.value).votes : 0;
      
      const data = {
        topic,
        weekNumber,
        votes: currentVotes + 1,
        lastUpdated: Date.now()
      };
      
      await this.storage.set(key, JSON.stringify(data), true); // shared = true
      
      console.log('✅ Trending topic updated:', topic);
      return true;
    } catch (error) {
      console.error('❌ Error saving trending topic:', error);
      return false;
    }
  }

  /**
   * Get trending topics for current week
   */
  async getTrendingTopics(weekNumber, limit = 10) {
    try {
      const prefix = `community:trending:week_${weekNumber}:`;
      const result = await this.storage.list(prefix, true); // shared = true
      
      if (!result || !result.keys || result.keys.length === 0) {
        return [];
      }
      
      const topics = [];
      for (const key of result.keys) {
        try {
          const data = await this.storage.get(key, true);
          if (data && data.value) {
            topics.push(JSON.parse(data.value));
          }
        } catch (err) {
          console.error('Error loading topic:', err);
        }
      }
      
      // Sort by votes
      topics.sort((a, b) => b.votes - a.votes);
      
      return topics.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting trending topics:', error);
      return [];
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get user journey summary
   */
  async getUserJourney() {
    const profile = await this.getUserProfile();
    const discoveries = await this.getDiscoveryHistory(10);
    const interests = await this.getTopInterests();
    const votes = await this.getVotingHistory(10);
    
    const daysSinceJoined = profile?.createdAt 
      ? Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      profile,
      daysSinceJoined,
      totalDiscoveries: profile?.totalDiscoveries || 0,
      totalVotes: profile?.totalVotes || 0,
      recentDiscoveries: discoveries,
      topInterests: interests,
      recentVotes: votes,
      expertiseLevel: this.calculateExpertiseLevel(profile)
    };
  }

  /**
   * Calculate expertise level
   */
  calculateExpertiseLevel(profile) {
    if (!profile) return 'beginner';
    
    const discoveries = profile.totalDiscoveries || 0;
    const votes = profile.totalVotes || 0;
    const totalActivity = discoveries + votes;
    
    if (totalActivity < 5) return 'beginner';
    if (totalActivity < 20) return 'intermediate';
    if (totalActivity < 50) return 'advanced';
    return 'expert';
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Get personalized recommendations
   */
  async getRecommendations() {
    const interests = await this.getTopInterests(3);
    const votingPatterns = await this.getVotingPatterns();
    
    const recommendations = {
      suggestedTopics: interests.map(i => i.topic),
      suggestedProposalTypes: Object.entries(votingPatterns.byType)
        .filter(([_, data]) => data.for > data.against)
        .map(([type, _]) => type),
      nextSteps: []
    };
    
    // Generate next steps
    const profile = await this.getUserProfile();
    const discoveries = profile?.totalDiscoveries || 0;
    
    if (discoveries < 5) {
      recommendations.nextSteps.push('Continue exploring! Make 5 more discoveries to unlock insights.');
    }
    if (discoveries >= 5 && discoveries < 20) {
      recommendations.nextSteps.push('You\'re making progress! Share your findings with the community.');
    }
    if (discoveries >= 20) {
      recommendations.nextSteps.push('Expert status! Consider proposing a research grant.');
    }
    
    return recommendations;
  }

  // ==================== UTILITY ====================

  /**
   * Clear user data (GDPR compliance)
   */
  async clearUserData() {
    if (!this.userId) return false;
    
    try {
      // List all user keys
      const prefixes = [
        `user:${this.userId}:profile`,
        `user:${this.userId}:discoveries:`,
        `user:${this.userId}:votes:`,
        `user:${this.userId}:conversations:`
      ];
      
      for (const prefix of prefixes) {
        const result = await this.storage.list(prefix);
        if (result && result.keys) {
          for (const key of result.keys) {
            await this.storage.delete(key);
          }
        }
      }
      
      console.log('✅ User data cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      return false;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData() {
    const journey = await this.getUserJourney();
    const discoveries = await this.getDiscoveryHistory(1000);
    const votes = await this.getVotingHistory(1000);
    const conversations = await this.getConversationHistory(1000);
    
    return {
      exportDate: new Date().toISOString(),
      userId: this.userId,
      profile: journey.profile,
      discoveries,
      votes,
      conversations,
      researchInterests: journey.topInterests
    };
  }
}

// Export singleton instance
export default new UnibaseService();