export interface CodeReviewConfig {
  id: string;
  description: string;
  file_extensions: {
    include: string[];
  };
  requires: {
    text: string[];
  };
  examples: {
    code: string;
    review_comment: string;
  }[];
}
