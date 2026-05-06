export default {
    async fetch(request) {
        const url = new URL(request.url);
        // Rewrite api.netreward.online/v1/* → Supabase /functions/v1/*
        const target = 'https://pmpeyfkbqipfnhokfksl.supabase.co/functions/v1' + url.pathname.replace('/v1', '');
        return fetch(target, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });
    }
}
