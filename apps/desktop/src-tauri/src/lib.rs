// O único Rust escrito à mão no Macbeth: receber os arquivos .mbth que o
// sistema pede para abrir (duplo clique, "Abrir com"). Todo o resto é dos
// plugins oficiais do Tauri.

use std::{path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_fs::FsExt;

/// Arquivos pedidos pelo sistema que a janela ainda não buscou.
#[derive(Default)]
struct Requested(Mutex<Vec<String>>);

/// Libera o arquivo para o app ler e gravar e avisa a janela, que o busca
/// com `take_requested_files`. Chegando antes de a janela carregar, ele
/// espera na fila.
fn request_open(app: &AppHandle, paths: impl IntoIterator<Item = PathBuf>) {
  let mbth = |p: &PathBuf| p.extension().is_some_and(|e| e.eq_ignore_ascii_case("mbth"));
  for path in paths.into_iter().filter(mbth) {
    if app.fs_scope().allow_file(&path).is_ok() {
      app.state::<Requested>().0.lock().unwrap().push(path.to_string_lossy().into_owned());
      let _ = app.emit("open-requested", ());
    }
  }
}

#[tauri::command]
fn take_requested_files(requested: tauri::State<Requested>) -> Vec<String> {
  std::mem::take(&mut *requested.0.lock().unwrap())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Windows e Linux: um duplo clique com o app já aberto inicia outra
    // cópia dele, que entrega o arquivo a esta e fecha. Precisa vir primeiro.
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
      request_open(app, args.into_iter().skip(1).map(PathBuf::from));
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
      }
    }))
    .plugin(tauri_plugin_fs::init())
    // Lembra os arquivos liberados, para os recentes abrirem depois de reiniciar.
    .plugin(tauri_plugin_persisted_scope::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .manage(Requested::default())
    .invoke_handler(tauri::generate_handler![take_requested_files])
    .setup(|app| {
      // Windows e Linux: o arquivo do duplo clique chega na linha de comando.
      request_open(app.handle(), std::env::args().skip(1).map(PathBuf::from));
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("falha ao iniciar o Macbeth")
    .run(|_app, _event| {
      // macOS: o arquivo chega por um evento, com o app aberto ou não.
      #[cfg(target_os = "macos")]
      if let tauri::RunEvent::Opened { urls } = _event {
        request_open(_app, urls.into_iter().filter_map(|url| url.to_file_path().ok()));
      }
    });
}
