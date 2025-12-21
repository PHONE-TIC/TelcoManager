
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        const user = loginRes.data.user;
        console.log('Logged in as:', user.nom, user.id);

        console.log('Fetching interventions...');
        const res = await axios.get(`${API_URL}/interventions`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                technicienId: user.id,
                limit: 50
            }
        });

        console.log('Success! Count:', res.data.interventions.length);

    } catch (error: any) {
        console.error('Error Occurred!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

test();
