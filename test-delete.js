const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  // Test message delete
  const { data, error } = await s.from('messages').select('id, content, deleted_at').eq('deleted_at', null).limit(3);
  console.log('Non-deleted messages:', JSON.stringify(data));
  console.log('Fetch error:', error?.message);
  
  if (data && data[0]) {
    const testId = data[0].id;
    const origContent = data[0].content;
    
    const { error: updErr } = await s.from('messages')
      .update({ deleted_at: new Date().toISOString(), content: '', image_url: null })
      .eq('id', testId);
    console.log('Update error:', updErr?.message || 'OK - delete works');
    
    const { data: check } = await s.from('messages').select('id, deleted_at, content').eq('id', testId).single();
    console.log('After delete:', JSON.stringify(check));
    
    // Revert
    await s.from('messages').update({ deleted_at: null, content: origContent }).eq('id', testId);
    console.log('Reverted');
  }
  
  // Test photo comment insert
  const { data: photos } = await s.from('photos').select('id').limit(1);
  if (photos && photos[0]) {
    const { data: parts } = await s.from('participants').select('id').limit(1);
    if (parts && parts[0]) {
      const { error: insErr } = await s.from('photo_comments').insert({
        photo_id: photos[0].id,
        author_id: parts[0].id,
        content: 'test diagnostic'
      });
      console.log('Photo comment insert:', insErr?.message || 'OK');
      
      // Clean up
      if (!insErr) {
        await s.from('photo_comments').delete().eq('content', 'test diagnostic');
        console.log('Cleaned up test comment');
      }
    }
  }
})();
