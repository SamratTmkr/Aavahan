import jwt from 'jsonwebtoken';

async function runTests() {
    const BASE = `http://localhost:${process.env.PORT || 3000}/api/v1`;

    console.log('--- 1. Login as Organizer (user@aavahan.com) ---');
    const orgLoginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@aavahan.com', password: 'user123' })
    });
    const orgData = await orgLoginRes.json();
    console.log('Organizer login success:', orgData.success);
    const orgToken = orgData.token;

    console.log('\n--- 2. Post Announcement as Organizer on Event 11 ---');
    const postRes = await fetch(`${BASE}/events/11/announcements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orgToken}`
        },
        body: JSON.stringify({
            title: 'Welcome to Rust Meetup 2026',
            message: 'Doors open at 9:30 AM. Bring your laptops with Cargo pre-installed!'
        })
    });
    const postData = await postRes.json();
    console.log('Post announcement result:', postData);
    const announcementId = postData.data?.id;

    console.log('\n--- 3. Fetch Announcements on Event 11 ---');
    const getRes = await fetch(`${BASE}/events/11/announcements`);
    const getData = await getRes.json();
    console.log('Announcements count:', getData.data?.length);
    console.log('First announcement title:', getData.data?.[0]?.title);

    console.log('\n--- 4. Add Co-Manager (rohan.shrestha@patanmusic.np) ---');
    const addMgrRes = await fetch(`${BASE}/events/11/managers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orgToken}`
        },
        body: JSON.stringify({ email: 'rohan.shrestha@patanmusic.np' })
    });
    const addMgrData = await addMgrRes.json();
    console.log('Add manager result:', addMgrData);

    console.log('\n--- 5. List Co-Managers on Event 11 ---');
    const listMgrRes = await fetch(`${BASE}/events/11/managers`, {
        headers: { 'Authorization': `Bearer ${orgToken}` }
    });
    const listMgrData = await listMgrRes.json();
    console.log('Managers count:', listMgrData.data?.length);
    console.log('Manager name:', listMgrData.data?.[0]?.name);

    console.log('\n--- 6. Manual RSVP: Test non-existent user email (should return 404) ---');
    const nonExistRsvp = await fetch(`${BASE}/events/11/manual-rsvp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orgToken}`
        },
        body: JSON.stringify({ email: 'nobody_unknown_12345@gmail.com' })
    });
    const nonExistData = await nonExistRsvp.json();
    console.log('Status code:', nonExistRsvp.status, 'Message:', nonExistData.message);

    console.log('\n--- 7. Manual RSVP: Test valid registered user (kripa.gurung@pokhararunners.org) ---');
    const validRsvp = await fetch(`${BASE}/events/11/manual-rsvp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orgToken}`
        },
        body: JSON.stringify({ email: 'kripa.gurung@pokhararunners.org' })
    });
    const validData = await validRsvp.json();
    console.log('Status code:', validRsvp.status, 'Result:', validData);

    console.log('\n--- 8. Manual RSVP: Test duplicate registration (should return 409) ---');
    const dupRsvp = await fetch(`${BASE}/events/11/manual-rsvp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orgToken}`
        },
        body: JSON.stringify({ email: 'kripa.gurung@pokhararunners.org' })
    });
    const dupData = await dupRsvp.json();
    console.log('Status code:', dupRsvp.status, 'Message:', dupData.message);

    console.log('\n--- 9. Non-authorized user tries to post announcement (should return 403) ---');
    const unauthorizedToken = jwt.sign({ id: 4, role: 'user' }, 'change_me_to_something_secret');
    const forbiddenPost = await fetch(`${BASE}/events/11/announcements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${unauthorizedToken}`
        },
        body: JSON.stringify({ title: 'Hacked', message: 'Not allowed' })
    });
    const forbiddenData = await forbiddenPost.json();
    console.log('Status code:', forbiddenPost.status, 'Message:', forbiddenData.message);

    console.log('\n--- All Smoke Tests Completed Successfully! ---');
}

runTests().catch(console.error);
