import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
    try {
        // Check if user already exists
        const existing = await prisma.technicien.findUnique({
            where: { username: 'test' }
        });

        if (existing) {
            console.log('✅ User "test" already exists');
            console.log('   Username: test');
            console.log('   Password: test123');
            return;
        }

        // Create test user
        const user = await prisma.technicien.create({
            data: {
                username: 'test',
                passwordHash: await bcrypt.hash('test123', 10),
                nom: 'Utilisateur Test',
                role: 'admin',
                active: true
            }
        });

        console.log('✅ Test user created successfully!');
        console.log('   Username: test');
        console.log('   Password: test123');
        console.log('   Role: Admin');
        console.log('   ID:', user.id);
    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser();
