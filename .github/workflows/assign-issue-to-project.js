const fetch = require('node-fetch');

async function assignIssueToProject() {
  const projectUrl = 'https://api.github.com/users/PSYCHEER/projects/4';
  const columnName = 'Suggestions';
  const issueUrl = process.env.ISSUE_URL;
  const token = process.env.GH_PAT;

  console.log(`Assigning issue to project: ${projectUrl}`);
  console.log(`Column name: ${columnName}`);

  const projectId = projectUrl.split('/').pop();

  const columnsResponse = await fetch(`https://api.github.com/projects/${projectId}/columns`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.inertia-preview+json'
    }
  });

  if (!columnsResponse.ok) {
    throw new Error(`Failed to fetch columns: ${columnsResponse.statusText}`);
  }

  const columns = await columnsResponse.json();
  console.log(`Columns fetched: ${JSON.stringify(columns)}`);

  const column = columns.find(col => col.name === columnName);
  if (!column) throw new Error(`Column ${columnName} not found`);

  console.log(`Assigning to column ID: ${column.id}`);

  const cardResponse = await fetch(`https://api.github.com/projects/columns/${column.id}/cards`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.inertia-preview+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content_id: process.env.ISSUE_ID,
      content_type: 'Issue'
    })
  });

  if (!cardResponse.ok) {
    throw new Error(`Failed to create card: ${cardResponse.statusText}`);
  }

  console.log('Issue successfully assigned to project');
}

assignIssueToProject().catch(error => {
  console.error(`Error assigning issue to project: ${error.message}`);
  throw error;
});