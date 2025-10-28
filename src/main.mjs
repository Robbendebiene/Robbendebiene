import { readFileSync, writeFileSync } from 'node:fs';
import Handlebars from "handlebars";
import minimist from 'minimist';
import GitHubDataService from "./data.mjs";

// RUN VIA: node src/main.mjs --templateFile pth/to/file.hbs --accessToken XXX

var argv = minimist(process.argv.slice(2));

const filePath = argv["templateFile"];
const dataService = new GitHubDataService( argv["accessToken"]);


// The GraphQL API is limited to return only data for 1 year.
// Thus we first query the years in which the user was active and then make multiple queries per year.
// The alternative `repositoriesContributedTo` does unfortunately not return all repositories.

console.log('QUERY: years');

const years = await dataService.getContributionYears();

console.log('RESULT:', years);

// deduplicate results from the GraphQL API
const repoMap = new Map();

for (const year of years) {
  console.log(`QUERY: year ${year}`);
  const results = await dataService.getContributionsOfYear(year);
  console.log('RESULT:', results);
  for (const result of results) {
    // filter to only include external repos
    if (result.permission === 'READ') {
      // merge commit count for existing items
      const item = repoMap.get(result.url);
      if (item) {
        item.commitsCount += result.commitsCount;
      }
      else {
        repoMap.set(result.url, result);
      }
    }
  }
}

// sort by stars
const externalRepositories = Array.from(repoMap.values())
  .sort((a, b) => b.starsCount - a.starsCount);

console.log('RESULT:', externalRepositories);

// Read template file and replace occurrences of "externalRepositories".

const templateContents = readFileSync(filePath, 'utf8');
const template = Handlebars.compile(templateContents);
const substitutedContents = template({
  externalRepositories
});
writeFileSync('README.md', substitutedContents, )
