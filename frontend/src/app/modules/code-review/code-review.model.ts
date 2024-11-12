export interface CodeReviewConfig {
  id: string;
  title: string;
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
