// Quick test script for global search endpoint
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function testSearch() {
    try {
        // First login to get a token
        console.log('Logging in...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            username: 'john',
            password: 'password123'
        });

        const token = loginResponse.data.token;
        console.log('Token obtained:', token.substring(0, 20) + '...');

        // Test search
        console.log('\nTesting search with query "cable"...');
        const searchResponse = await axios.get(`${API_URL}/search/global`, {
            params: { q: 'cable' },
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('\nSearch Results:');
        console.log(JSON.stringify(searchResponse.data, null, 2));
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testSearch();
