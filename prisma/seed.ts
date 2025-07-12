import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create subscription plans
  console.log('📦 Creating subscription plans...');
  
  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'basic' },
    update: {},
    create: {
      name: 'basic',
      displayName: 'Basic Plan',
      description: 'Perfect for individuals with a single property',
      price: 999, // $9.99 in cents
      maxHouses: 1,
      maxRoomsPerHouse: 20,
      maxItemsPerRoom: 100,
      isActive: true,
      allowTrial: true,
      sortOrder: 1,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      name: 'pro',
      displayName: 'Pro Plan',
      description: 'Great for families with multiple properties',
      price: 1999, // $19.99 in cents
      maxHouses: 5,
      maxRoomsPerHouse: 50,
      maxItemsPerRoom: 200,
      isActive: true,
      allowTrial: true,
      sortOrder: 2,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'premium' },
    update: {},
    create: {
      name: 'premium',
      displayName: 'Premium Plan',
      description: 'Unlimited access for property managers and businesses',
      price: 4999, // $49.99 in cents
      maxHouses: -1, // Unlimited
      maxRoomsPerHouse: -1, // Unlimited
      maxItemsPerRoom: -1, // Unlimited
      isActive: true,
      allowTrial: false,
      sortOrder: 3,
    },
  });

  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free Plan',
      description: 'Limited access for trying out the service',
      price: 0,
      maxHouses: 1,
      maxRoomsPerHouse: 5,
      maxItemsPerRoom: 25,
      isActive: true,
      allowTrial: false,
      sortOrder: 0,
    },
  });

  console.log('✅ Subscription plans created:', {
    free: freePlan.id,
    basic: basicPlan.id,
    pro: proPlan.id,
    premium: premiumPlan.id,
  });

  // Create system settings
  console.log('⚙️  Creating system settings...');
  
  const systemSettings = [
    {
      key: 'stripe_publishable_key',
      value: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_example',
    },
    {
      key: 'stripe_secret_key',
      value: process.env.STRIPE_SECRET_KEY || 'sk_test_example',
    },
    {
      key: 'stripe_webhook_secret',
      value: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_example',
    },
    {
      key: 'app_name',
      value: 'HomeContentsListPro V2',
    },
    {
      key: 'app_version',
      value: '2.0.0',
    },
    {
      key: 'maintenance_mode',
      value: 'false',
    },
    {
      key: 'max_file_size_mb',
      value: '10',
    },
    {
      key: 'trial_period_days',
      value: '14',
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('✅ System settings created');

  // Create admin user if it doesn't exist
  console.log('👤 Creating admin user...');
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@homecontentslistpro.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Administrator',
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin user created:', adminUser.email);
  } else {
    console.log('ℹ️  Admin user already exists:', existingAdmin.email);
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  }); 