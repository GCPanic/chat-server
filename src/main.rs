use actix_web::{App, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let app_factory = || {
        App::new().service(
            actix_files::Files::new("/static", "./public")
                .use_last_modified(true)
                .method_guard(actix_web::guard::Get()),
        )
    };
    HttpServer::new(app_factory)
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
