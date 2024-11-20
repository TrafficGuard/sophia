export interface CodeReviewConfig {
  id: string;
  title: string;
  enabled: boolean;
  description: string;
  fileExtensions: {
    include: string[];
  };
  projectPaths: string;
  tags: string[];
  requires: {
    text: string[];
  };
  examples: {
    code: string;
    reviewComment: string;
  }[];
}
