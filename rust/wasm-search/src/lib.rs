extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

use calm_go_patterns_common::baduk::{
    Placement, check_empty, get_rotations, get_surrounding_points, match_game, switch_colors,
    unpack_games,
};
use cfg_if::cfg_if;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::js_sys::Uint8Array;

cfg_if! {
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct WasmSearch {
    game_data: HashMap<String, Vec<Placement>>,
}

#[wasm_bindgen]
impl WasmSearch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmSearch {
        let packed = include_bytes!("games.pack");
        let game_data = unpack_games(packed);
        Self { game_data }
    }

    #[wasm_bindgen]
    pub async fn search(&self, position: Uint8Array) -> Uint8Array {
        let position_buf: Vec<u8> = position.to_vec();
        let position_decoded: Vec<Placement> = serde_json::from_slice(position_buf.as_slice())
            .expect("Failed to deserialize position");
        let results = self._search(&position_decoded);
        let results_buf: Vec<u8> =
            serde_json::to_vec(&results).expect("Failed to serialize results");
        Uint8Array::from(results_buf.as_slice())
    }

    fn _search(&self, position: &Vec<Placement>) -> Vec<SearchResult> {
        if position.is_empty() {
            return Vec::new();
        }
        let mut results = Vec::new();
        let rotations = get_rotations(&position);
        let inverse = switch_colors(&position);
        let inverse_rotations = get_rotations(&inverse);
        for (path, moves) in &self.game_data {
            let mut matched = match_game(&position, moves);
            if let Some(last_move_matched) = matched {
                results.push(SearchResult {
                    path: path.clone(),
                    score: 11,
                    last_move_matched,
                });
                continue;
            }
            for rotation in &rotations {
                matched = match_game(rotation, moves);
                if let Some(last_move_matched) = matched {
                    results.push(SearchResult {
                        path: path.clone(),
                        score: 10,
                        last_move_matched,
                    });
                    break;
                }
            }
            if matched.is_none() {
                matched = match_game(&inverse, moves);
                if let Some(last_move_matched) = matched {
                    results.push(SearchResult {
                        path: path.clone(),
                        score: 9,
                        last_move_matched,
                    });
                    continue;
                }
                for rotation in &inverse_rotations {
                    matched = match_game(rotation, moves);
                    if let Some(last_move_matched) = matched {
                        results.push(SearchResult {
                            path: path.clone(),
                            score: 8,
                            last_move_matched,
                        });
                        break;
                    }
                }
            }
        }
        for result in &mut results {
            let moves = self
                .game_data
                .get(&result.path)
                .expect("Inconsistent game data");
            let truncated_moves = &moves[..result.last_move_matched];
            let mut checked = Vec::new();
            for placement in position.clone() {
                for i in 1..3 {
                    let mut surrounding = get_surrounding_points(&placement.point, i);
                    surrounding = surrounding
                        .iter()
                        .filter(|p| !position.iter().any(|m| m.point == **p))
                        .cloned()
                        .collect();
                    surrounding = surrounding
                        .iter()
                        .filter(|p| !checked.contains(*p))
                        .cloned()
                        .collect();
                    checked.extend(surrounding.iter().cloned());
                    if check_empty(&surrounding, truncated_moves) {
                        result.score += i as i16;
                    }
                }
            }
        }

        results
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SearchResult {
    path: String,
    score: i16,
    last_move_matched: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiate() {
        let wasm_search = WasmSearch::new();
        assert!(wasm_search.game_data.len() > 0);
    }
}
