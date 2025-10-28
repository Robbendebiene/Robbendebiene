import { graphql } from "@octokit/graphql";

/**
 * Using this service requires a valid GitHub auth token.
 * The token does not need any additional permissions.
 * See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
 */
export default class GitHubDataService {
  #graphqlWithAuth;

  constructor(accessToken) {
    if (!accessToken) throw('You must provide a GitHub access token.');
    this.#graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${accessToken}`,
      }
    });
  }

  /**
   * Query the years in which the user contributed.
   */
  async getContributionYears(year) {
    const {
      viewer: {
        contributionsCollection: {
          contributionYears
        }
      }
    } = await this.#graphqlWithAuth(
      `
        query {
          viewer {
            login
            contributionsCollection {
              contributionYears
            }
          }
        }
      `
    );
    return contributionYears;
  }

  /**
   * Query all repositories the user committed to from a given date limited by one year.
   */
  async getContributionsOfYear(year) {
    const date = new Date(Date.UTC(year));
    const {
      viewer: {
        login: user,
        contributionsCollection: {
          commitContributionsByRepository
        }
      }
    } = await this.#graphqlWithAuth(
      `
        query ($from: DateTime!) {
          viewer {
            login
            contributionsCollection(from: $from) {
              commitContributionsByRepository(maxRepositories: 100) {
                contributions {
                  totalCount
                }
                repository {
                  nameWithOwner
                  url
                  viewerPermission
                  stargazerCount
                }
              }
            }
          }
        }
      `,
      {
        'from': date.toISOString(),
      }
    );

    return commitContributionsByRepository.map((re) => ({
      fullName: re.repository.nameWithOwner,
      permission: re.repository.viewerPermission,
      url: re.repository.url,
      starsCount: re.repository.stargazerCount,
      commitsCount: re.contributions.totalCount,
      commitsURL: `https://github.com/${re.repository.nameWithOwner}/commits?author=${user}`
    }));
  }
}
