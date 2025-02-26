const { graphql } = require('@octokit/graphql');
const fs = require('fs');

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: 'token ' + process.env.TOKEN
  }
});

async function run() {
  const context = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const issue = context.issue;
  const labels = issue.labels.map(label => label.name);

  console.log('Issue labels:', labels);

  let status = 'Issue'; // Default status
  if (labels.includes('bug')) {
    status = 'Issue';
  } else if (labels.includes('addon')) {
    status = 'Suggestions';
  } else if (labels.includes('enhancement')) {
    status = 'Suggestions';
  }

  console.log('Determined status:', status);

  // Fetch fields using GraphQL
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          title
          items(first: 20) {
            nodes {
              id
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await graphqlWithAuth(query, {
    projectId: process.env.PROJECT_ID
  });

  console.log('Project fields:', result.node.items.nodes);

  const column = result.node.items.nodes.find(item => item.fieldValues.nodes.some(field => field.field.name === 'Status' && field.name === status));
  if (!column) {
    throw new Error(`Column with status ${status} not found`);
  }

  console.log('Found column:', column);

  // Create card in the column
  const mutation = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
  `;

  await graphqlWithAuth(mutation, {
    projectId: process.env.PROJECT_ID,
    contentId: issue.id
  });

  console.log('Card created in column:', column.name);
}

run().catch(error => console.error('Error:', error));