import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const usePoolQuestionsListQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.poolQuestions.list.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const usePoolQuestionAnswersQuery = (questionId: string | null) =>
  useQuery({
    ...orpc.poolQuestions.listAnswers.queryOptions({ input: { questionId: questionId ?? "" } }),
    enabled: !!questionId,
  });

export const useCreatePoolQuestionMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.poolQuestions.create.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.poolQuestions.list.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};

export const useUpdatePoolQuestionMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.poolQuestions.update.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.poolQuestions.list.queryOptions({ input: { poolId } }).queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.listQuestionScores.queryOptions({ input: { poolId } }).queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.ranking.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};

export const useAnswerPoolQuestionMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.poolQuestions.answer.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.poolQuestions.list.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};

export const useReviewPoolQuestionAnswerMutation = (questionId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.poolQuestions.reviewAnswer.mutationOptions({
      onSuccess: () => {
        if (!questionId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.poolQuestions.listAnswers.queryOptions({ input: { questionId } }).queryKey });
      },
    }),
  );
};
