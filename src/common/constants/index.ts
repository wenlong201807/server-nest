// 用户状态
export enum UserStatus {
  NORMAL = 0,    // 正常
  MUTED = 1,     // 禁言
  BANNED = 2,    // 封号
}

// 用户性别
export enum Gender {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
}

// 认证类型
export enum CertificationType {
  HOUSE = 'house',          // 房产
  EDUCATION = 'education',  // 学历
  ID_CARD = 'id_card',      // 身份证
  BUSINESS = 'business',    // 营业执照
  DRIVER = 'driver',        // 驾驶证
  UTILITY = 'utility',      // 水电表
}

// 认证状态
export enum CertificationStatus {
  PENDING = 0,   // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
}

// 积分类型
export enum PointsType {
  EARN = 1,      // 获得
  CONSUME = 2,   // 消费
}

// 积分来源
export enum PointsSourceType {
  REGISTER = 'register',         // 注册
  SIGN = 'sign',                // 签到
  PUBLISH = 'publish',           // 发布帖子
  COMMENT = 'comment',           // 评论
  LIKE = 'like',                // 点赞
  INVITE = 'invite',             // 邀请
  UNLOCK_CHAT = 'unlock_chat',   // 解锁私聊
  UNLOCK_FRIEND = 'unlock_friend', // 解锁好友
  BUY_FRIEND_SLOT = 'buy_friend_slot', // 购买好友位
  DEDUCT_VIOLATION = 'deduct_violation', // 违规扣除
}

// 常量配置
export const REQUIRED_CHAT_COUNT = 8;
export const UNLOCK_FRIEND_POINTS = 50;
export const REGISTER_POINTS = 2000;
export const INVITE_POINTS = 100;
export const PUBLISH_POST_POINTS = 5;

// 帖子状态
export enum PostStatus {
  NORMAL = 0,     // 正常
  DELETED = 1,    // 已删除
  VIOLATION = 2,  // 违规删除
}

// 消息类型
export enum MsgType {
  TEXT = 1,    // 文本
  IMAGE = 2,   // 图片
  EMOJI = 3,   // 表情
}

// 好友状态
export enum FriendStatus {
  FOLLOWING = 0,  // 关注中
  FRIEND = 1,     // 已是好友
}

// 目标类型（用于点赞）
export enum TargetType {
  POST = 1,   // 帖子
  COMMENT = 2, // 评论
}

// 举报原因
export enum ReportReason {
  PORNOGRAPHY = 1,  // 色情
  VIOLENCE = 2,     // 暴力
  AD = 3,           // 广告
  FRAUD = 4,        // 诈骗
  OTHER = 5,        // 其他
}

// 违规类型
export enum ViolationType {
  ILLEGAL_CONTENT = 1,  // 发布违规内容
  MULTIPLE_VIOLATION = 2, // 多次违规
  MALICIOUS_REPORT = 3,  // 恶意举报
}

// 处理状态
export enum HandleStatus {
  PENDING = 0,   // 待处理
  HANDLED = 1,   // 已处理
}
