// Evita abrir uma janela de console no Windows na versão final. Não remover.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  macbeth_lib::run();
}
