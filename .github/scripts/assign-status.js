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

  // Fetch columns using GraphQL
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          title
          views(first: 10) {
            nodes {
              ... on ProjectV2View {
                id
                title
                columns(first: 20) {
                  nodes {
                    id
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

  console.log('Project columns:', JSON.stringify(result.node.views.nodes, null, 2));

  const column = result.node.views.nodes.flatMap(view => view.columns.nodes).find(col => col.name === status);
  if (!column) {
    throw new Error(`Column with status ${status} not found`);
  }

  console.log('Found column:', column);

  // Create card in the column
  const mutation = `
    mutation($columnId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $columnId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
  `;

  await graphqlWithAuth(mutation, {
    columnId: column.id,
    contentId: issue.id
  });

  console.log('Card created in column:', column.name);
}

run().catch(error => console.error('Error:', error));