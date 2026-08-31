const projectStatusLabels = {
  building: '建设中',
  maintaining: '持续维护',
  archived: '已归档',
} as const;

const knowledgeStatusLabels = {
  seed: '刚刚起步',
  growing: '持续生长',
  stable: '相对稳定',
} as const;

const topicStatusLabels = {
  mapping: '正在绘制',
  growing: '持续生长',
  established: '已有体系',
} as const;

const updateKindLabels = {
  site: '站点',
  knowledge: '知识',
  project: '项目',
  content: '内容',
} as const;

const updateStatusLabels = {
  completed: '已完成',
  'in-progress': '进行中',
} as const;

const portalKindLabels = {
  page: '页面',
  post: '文章',
  talk: '说说',
  knowledge: '知识',
  project: '项目',
  update: '更新',
} as const;

export const projectStatusLabel = (status: keyof typeof projectStatusLabels) => projectStatusLabels[status];
export const knowledgeStatusLabel = (status: keyof typeof knowledgeStatusLabels) => knowledgeStatusLabels[status];
export const topicStatusLabel = (status: keyof typeof topicStatusLabels) => topicStatusLabels[status];
export const updateKindLabel = (kind: keyof typeof updateKindLabels) => updateKindLabels[kind];
export const updateStatusLabel = (status: keyof typeof updateStatusLabels) => updateStatusLabels[status];
export const portalKindLabel = (kind: keyof typeof portalKindLabels) => portalKindLabels[kind];
