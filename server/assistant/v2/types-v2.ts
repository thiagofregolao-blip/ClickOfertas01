export interface ConversationMemory {
  shortTerm: {
    currentContext: string;
    recentProducts: string[];
    lastInteractions: InteractionRecord[];
    sessionGoals: string[];
  };
  longTerm: {
    userProfile: UserProfile;
    preferences: UserPreferences;
    behaviorPatterns: BehaviorPattern[];
    purchaseHistory: PurchaseRecord[];
  };
}

export interface UserProfile {
  id: string;
  demographics: {
    ageRange?: string;
    location?: string;
    language: string;
  };
  psychographics: {
    personality: PersonalityTraits;
    communicationStyle: CommunicationStyle;
    decisionMakingStyle: DecisionStyle;
  };
  engagement: {
    totalSessions: number;
    averageSessionDuration: number;
    preferredChannels: string[];
    responsePatterns: ResponsePattern[];
    totalPurchases?: number;
  };
}

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface CommunicationStyle {
  formality: 'casual' | 'formal' | 'mixed';
  verbosity: 'concise' | 'detailed' | 'adaptive';
  emotionalExpression: 'high' | 'medium' | 'low';
  questioningStyle: 'direct' | 'exploratory' | 'consultative';
}

export interface DecisionStyle {
  speed: 'impulsive' | 'quick' | 'deliberate' | 'analytical';
  riskTolerance: 'high' | 'medium' | 'low';
  informationNeed: 'minimal' | 'moderate' | 'comprehensive';
  socialInfluence: 'high' | 'medium' | 'low';
}

export interface UserPreferences {
  categories: string[];
  brands: string[];
  priceRange: {
    min: number;
    max: number;
    flexibility: number;
  };
  features: {
    [key: string]: number;
  };
  dealBreakers: string[];
  mustHaves: string[];
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  context: string[];
  outcomes: string[];
  confidence: number;
  lastObserved: Date;
}

export interface InteractionRecord {
  timestamp: Date;
  type: 'query' | 'click' | 'purchase' | 'abandon' | 'feedback' | 'message' | 'purchase_intent' | 'price_inquiry' | 'comparison';
  content: string;
  context: any;
  outcome?: string;
  sentiment?: EmotionalState;
  id?: string;
  userId?: string;
  metadata?: any;
  sessionId?: string;
}

export interface PurchaseRecord {
  productId: string;
  category: string;
  price: number;
  timestamp: Date;
  satisfaction?: number;
  context: string;
}

export interface EmotionalState {
  primary: EmotionType;
  intensity: number;
  confidence: number;
  triggers: string[];
  context: string;
}

export type EmotionType = 
  | 'joy' | 'excitement' | 'satisfaction' | 'curiosity' | 'interest'
  | 'frustration' | 'confusion' | 'disappointment' | 'anxiety' | 'impatience'
  | 'neutral' | 'contemplative' | 'decisive' | 'hesitant' | 'overwhelmed';

export interface ResponsePattern {
  trigger: string;
  response: string;
  effectiveness: number;
  frequency: number;
  lastUsed: Date;
}

export interface ProactiveInsight {
  type: 'behavioral' | 'contextual' | 'temporal' | 'comparative';
  insight: string;
  message: string;
  confidence: number;
  actionable: boolean;
  suggestedActions: string[];
  priority: number;
  expiresAt?: Date;
}

export interface FollowUpRule {
  id: string;
  name: string;
  trigger: {
    conditions: FollowUpCondition[];
    operator: 'AND' | 'OR';
  };
  timing: {
    delay: number;
    window: number;
    maxAttempts: number;
  };
  message: {
    template: string;
    personalization: string[];
  };
  priority: number;
  active: boolean;
}

export interface FollowUpCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists' | 'not_exists';
  value: any;
  weight: number;
}

export interface IntelligentVendorResponse {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  metadata: {
    intent?: any;
    emotionalState?: EmotionalState;
    proactiveInsights?: ProactiveInsight[];
    processingTime?: number;
    confidence?: number;
    error?: boolean;
    errorMessage?: string;
  };
  suggestions: string[];
  recommendedProducts: any[];
  followUpSuggestions: string[];
}

export interface ContextStack {
  contexts: ContextFrame[];
  maxSize: number;
  currentFocus: string;
}

export interface ContextFrame {
  id: string;
  type: 'product' | 'category' | 'comparison' | 'problem' | 'goal';
  content: any;
  relevance: number;
  timestamp: Date;
  expiresAt?: Date;
  relationships: string[];
}
