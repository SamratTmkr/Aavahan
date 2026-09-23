import bcrypt from 'bcryptjs';
import pool from '../src/db.js';

async function seedDatabase() {
    console.log('--- Starting Aavahan Database Seeding ---');

    // 1. Password hashes
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    const demoPasswordHash = await bcrypt.hash('user123', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    // 2. Clear old test data cleanly (optional or upsert)
    console.log('Ensuring clean state...');
    await pool.query('DELETE FROM rsvps');
    await pool.query('DELETE FROM events');
    await pool.query('DELETE FROM `groups`');
    await pool.query('DELETE FROM users');

    // Reset auto-increments
    await pool.query('ALTER TABLE users AUTO_INCREMENT = 1');
    await pool.query('ALTER TABLE `groups` AUTO_INCREMENT = 1');
    await pool.query('ALTER TABLE events AUTO_INCREMENT = 1');
    await pool.query('ALTER TABLE rsvps AUTO_INCREMENT = 1');

    // 3. Insert Users (Organizers & Community Members)
    console.log('Inserting real users...');
    const usersData = [
        // Organizers & Key Leads
        { name: 'Demo User', email: 'user@aavahan.com', password: demoPasswordHash, role: 'user' },
        { name: 'Admin', email: 'admin@aavahan.com', password: adminPasswordHash, role: 'admin' },
        { name: 'Dr. Pratigya Sharma', email: 'pratigya.sharma@kathmandutech.org', password: defaultPasswordHash, role: 'user' },
        { name: 'Kripa Gurung', email: 'kripa.gurung@pokhararunners.org', password: defaultPasswordHash, role: 'user' },
        { name: 'Rohan Shrestha', email: 'rohan.shrestha@patanmusic.np', password: defaultPasswordHash, role: 'user' },
        { name: 'Sarita Shrestha', email: 'sarita.s@foundersnepal.com', password: defaultPasswordHash, role: 'user' },

        // Real Community Members / Attendees
        { name: 'Pooja Manandhar', email: 'pooja.m@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Roshan Adhikari', email: 'roshan.a@outlook.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Anjali Karki', email: 'anjali.karki@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Samrat Tamrakar', email: 'samrat.tamrakar@hotmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Alex Shrestha', email: 'alex.shrestha@yahoo.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Prabhat Gurung', email: 'prabhat.gurung@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Sujan Thapa', email: 'sujan.thapa@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Sita Rai', email: 'sita.rai@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Bikash Magar', email: 'bikash.magar@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Deepa Joshi', email: 'deepa.joshi@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Nabin Chaudhary', email: 'nabin.chaudhary@gmail.com', password: defaultPasswordHash, role: 'user' },
        { name: 'Manish Shakya', email: 'manish.shakya@gmail.com', password: defaultPasswordHash, role: 'user' }
    ];

    const userIds = {};
    for (const u of usersData) {
        const [res] = await pool.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [u.name, u.email, u.password, u.role]
        );
        userIds[u.email] = res.insertId;
    }
    console.log(`Seeded ${Object.keys(userIds).length} users successfully.`);

    // 4. Insert Community Groups
    console.log('Inserting community groups...');
    const groupsData = [
        {
            name: 'Kathmandu Tech & AI Innovators',
            description: 'A thriving community of software engineers, AI researchers, designers, and students in Kathmandu Valley collaborating on cutting-edge technologies.',
            category: 'Technology & AI',
            city: 'Kathmandu',
            organizer_id: userIds['user@aavahan.com'], // Owned by Demo User so their organizer dashboard is populated!
            member_count: 0
        },
        {
            name: 'Pokhara Trail Running & Outdoor Adventure',
            description: 'Weekly trail runs around Sarangkot, lakeside camps, mountain biking, and environmental cleanups in the Annapurna foothills.',
            category: 'Nature & Outdoors',
            city: 'Pokhara',
            organizer_id: userIds['kripa.gurung@pokhararunners.org'],
            member_count: 0
        },
        {
            name: 'Patan Live Music & Acoustic Circle',
            description: 'Dedicated to traditional Newari folk fusion, indie acoustic songwriting, and open-mic jam sessions in historic Patan.',
            category: 'Live Music',
            city: 'Lalitpur',
            organizer_id: userIds['rohan.shrestha@patanmusic.np'],
            member_count: 0
        },
        {
            name: 'Himalayan Founders & Angel Network',
            description: 'Connecting Nepali startup founders, angel investors, venture capitalists, and operators to build high-impact scalable companies.',
            category: 'Career & Business',
            city: 'Kathmandu',
            organizer_id: userIds['sarita.s@foundersnepal.com'],
            member_count: 0
        }
    ];

    const groupIds = {};
    for (const g of groupsData) {
        const [res] = await pool.execute(
            'INSERT INTO `groups` (name, description, category, city, member_count, organizer_id) VALUES (?, ?, ?, ?, ?, ?)',
            [g.name, g.description, g.category, g.city, g.member_count, g.organizer_id]
        );
        groupIds[g.name] = res.insertId;
    }
    console.log(`Seeded ${Object.keys(groupIds).length} groups successfully.`);

    // 5. Insert Events
    console.log('Inserting real events...');
    const eventsData = [
        {
            title: 'Kathmandu Tech Summit 2026: AI & Microservices',
            description: 'Join over 200 developers, architects, and founders for Nepal\'s flagship tech gathering. We dive into large language models in production, distributed microservices, high-throughput caching with Redis, and scaling infrastructure. Includes networking high-tea, keynote panels, and swag.',
            category: 'Technology & AI',
            venue: 'Heritage Convention Hall, Durbar Marg',
            address: 'Durbar Marg, Kathmandu 44600',
            city: 'Kathmandu',
            country: 'Nepal',
            event_date: '2026-09-18',
            start_time: '09:30:00',
            end_time: '17:00:00',
            is_free: false,
            min_price: 1500,
            currency: 'NPR',
            is_online: false,
            capacity: 250,
            group_id: groupIds['Kathmandu Tech & AI Innovators'],
            organizer_id: userIds['user@aavahan.com'] // Owned by Demo User
        },
        {
            title: 'Community Open Source & Python AI Hacknight',
            description: 'Bring your laptop and code alongside top open-source contributors! We will be hacking on open models, building FastAPI backends, and fine-tuning Nepali NLP datasets. Mentors will be available throughout the night. Refreshments and fast Wi-Fi provided.',
            category: 'Technology & AI',
            venue: 'DevSpace Hub, New Baneshwor',
            address: 'New Baneshwor, Kathmandu',
            city: 'Kathmandu',
            country: 'Nepal',
            event_date: '2026-09-26',
            start_time: '18:00:00',
            end_time: '22:00:00',
            is_free: true,
            min_price: 0,
            currency: 'NPR',
            is_online: false,
            capacity: 60,
            group_id: groupIds['Kathmandu Tech & AI Innovators'],
            organizer_id: userIds['user@aavahan.com'] // Owned by Demo User
        },
        {
            title: 'Pokhara Sunrise Trail Run & Lakeside Camp',
            description: 'An invigorating 12km scenic trail run starting from Lakeside, ascending through Sarangkot ridge, and looping back along the Phewa shoreline. All paces welcome. Post-run group breakfast and hydration provided by local sponsors.',
            category: 'Nature & Outdoors',
            venue: 'Phewa Lake North Shore Trailhead',
            address: 'Lakeside Road, Pokhara 33700',
            city: 'Pokhara',
            country: 'Nepal',
            event_date: '2026-10-04',
            start_time: '06:00:00',
            end_time: '11:00:00',
            is_free: true,
            min_price: 0,
            currency: 'NPR',
            is_online: false,
            capacity: 100,
            group_id: groupIds['Pokhara Trail Running & Outdoor Adventure'],
            organizer_id: userIds['kripa.gurung@pokhararunners.org']
        },
        {
            title: 'Nepal Indie Acoustic & Folk Fusion Night',
            description: 'Immerse yourself in traditional sarangi, flute, and modern acoustic guitar melodies under the ambient courtyard lights of Patan Museum. Live performances by 5 emerging local singer-songwriters followed by an open jam circle.',
            category: 'Live Music',
            venue: 'Patan Museum Courtyard, Mangal Bazaar',
            address: 'Patan Durbar Square, Lalitpur 44700',
            city: 'Lalitpur',
            country: 'Nepal',
            event_date: '2026-10-10',
            start_time: '18:00:00',
            end_time: '21:30:00',
            is_free: false,
            min_price: 500,
            currency: 'NPR',
            is_online: false,
            capacity: 180,
            group_id: groupIds['Patan Live Music & Acoustic Circle'],
            organizer_id: userIds['rohan.shrestha@patanmusic.np']
        },
        {
            title: 'Himalayan Founders Pitch: Angel & VC Demo Day',
            description: '10 seed-stage technology startups from across Nepal and the diaspora pitch to an esteemed panel of regional angel investors and venture funds. Featuring an opening keynote on regional expansion and cross-border payments.',
            category: 'Career & Business',
            venue: 'Online Interactive Webinar',
            address: 'Virtual Event via Zoom',
            city: 'Kathmandu',
            country: 'Nepal',
            event_date: '2026-10-17',
            start_time: '14:00:00',
            end_time: '17:30:00',
            is_free: true,
            min_price: 0,
            currency: 'NPR',
            is_online: true,
            capacity: 500,
            group_id: groupIds['Himalayan Founders & Angel Network'],
            organizer_id: userIds['sarita.s@foundersnepal.com']
        },
        {
            title: 'Bhaktapur Heritage Walk & Newari Culinary Meetup',
            description: 'Experience the rich terracotta architecture, pottery squares, and centuries-old temples of Bhaktapur with licensed cultural guides, followed by an authentic traditional Newari feast (Samay Baji) in a restored courtyard.',
            category: 'Arts & Culture',
            venue: 'Nyatapola Square Meeting Point',
            address: 'Taumadhi Square, Bhaktapur 44800',
            city: 'Bhaktapur',
            country: 'Nepal',
            event_date: '2026-10-24',
            start_time: '10:00:00',
            end_time: '15:00:00',
            is_free: false,
            min_price: 800,
            currency: 'NPR',
            is_online: false,
            capacity: 40,
            group_id: null,
            organizer_id: userIds['admin@aavahan.com']
        }
    ];

    const eventIds = [];
    for (const ev of eventsData) {
        const [res] = await pool.execute(
            `INSERT INTO events
             (title, description, category, venue, address, city, country, event_date, start_time, end_time, is_free, min_price, currency, is_online, capacity, group_id, organizer_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ev.title, ev.description, ev.category, ev.venue, ev.address, ev.city, ev.country,
                ev.event_date, ev.start_time, ev.end_time, ev.is_free, ev.min_price, ev.currency,
                ev.is_online, ev.capacity, ev.group_id, ev.organizer_id
            ]
        );
        eventIds.push({ id: res.insertId, title: ev.title, organizer_id: ev.organizer_id });
    }
    console.log(`Seeded ${eventIds.length} events successfully.`);

    // 6. Insert Real RSVPs (Registrations by Real People!)
    console.log('Registering attendees for events...');
    const memberEmails = [
        'pooja.m@gmail.com',
        'roshan.a@outlook.com',
        'anjali.karki@gmail.com',
        'samrat.tamrakar@hotmail.com',
        'alex.shrestha@yahoo.com',
        'prabhat.gurung@gmail.com',
        'sujan.thapa@gmail.com',
        'sita.rai@gmail.com',
        'bikash.magar@gmail.com',
        'deepa.joshi@gmail.com',
        'nabin.chaudhary@gmail.com',
        'manish.shakya@gmail.com'
    ];

    // Distribute members across events with realistic RSVP dates and check-in statuses
    const rsvpPlans = [
        // Kathmandu Tech Summit: popular!
        { eventIndex: 0, attendees: memberEmails.slice(0, 10), checkInIndices: [0, 1, 3] },
        // AI Hacknight:
        { eventIndex: 1, attendees: memberEmails.slice(1, 8), checkInIndices: [0, 2] },
        // Pokhara Trail Run:
        { eventIndex: 2, attendees: memberEmails.slice(3, 9), checkInIndices: [1] },
        // Patan Live Music:
        { eventIndex: 3, attendees: memberEmails.slice(0, 7), checkInIndices: [0, 4] },
        // Founders Pitch:
        { eventIndex: 4, attendees: memberEmails.slice(2, 12), checkInIndices: [] },
        // Bhaktapur Heritage:
        { eventIndex: 5, attendees: memberEmails.slice(5, 11), checkInIndices: [0] }
    ];

    let totalRsvpsCreated = 0;
    for (const plan of rsvpPlans) {
        const ev = eventIds[plan.eventIndex];
        let eventCount = 0;

        for (let i = 0; i < plan.attendees.length; i++) {
            const email = plan.attendees[i];
            const userId = userIds[email];
            const isCheckedIn = plan.checkInIndices.includes(i);
            const status = isCheckedIn ? 'checked_in' : 'confirmed';
            const checkedInAt = isCheckedIn ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

            if (!userId) {
                console.error(`Missing userId for email: ${email}`);
                continue;
            }

            await pool.execute(
                'INSERT INTO rsvps (event_id, user_id, status, checked_in_at) VALUES (?, ?, ?, ?)',
                [ev.id, userId, status, checkedInAt]
            );
            eventCount++;
            totalRsvpsCreated++;
        }

        // Update the event's attendee_count in the events table
        await pool.execute('UPDATE events SET attendee_count = ? WHERE id = ?', [eventCount, ev.id]);
    }

    console.log(`Registered ${totalRsvpsCreated} real attendee RSVPs across events.`);
    console.log('--- Seeding Completed Successfully! ---');
    process.exit(0);
}

seedDatabase().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
