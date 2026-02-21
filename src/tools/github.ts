import { Octokit } from '@octokit/rest';
import { config } from '../config';
import { RunContext, withContext } from '../core/context';

const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
const [owner, repo] = config.GITHUB_REPO.split('/');

export const githubTools = {
    getClient: () => octokit,

    createIssue: async (
        ctx: RunContext,
        title: string,
        body: string,
        labels?: string[]
    ) => {
        return withContext(ctx, `GitHub Create Issue`, async () => {
            const { data } = await octokit.issues.create({
                owner,
                repo,
                title,
                body,
                labels
            });
            return data;
        });
    },

    createComment: async (
        ctx: RunContext,
        issueNumber: number,
        body: string
    ) => {
        return withContext(ctx, `GitHub Create Comment [#${issueNumber}]`, async () => {
            const { data } = await octokit.issues.createComment({
                owner,
                repo,
                issue_number: issueNumber,
                body
            });
            return data;
        });
    }
};
