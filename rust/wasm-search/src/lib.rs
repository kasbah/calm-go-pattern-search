extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

use calm_go_patterns_common::baduk::{
    Placement, check_empty, check_within_one_quadrant, get_mirrored, get_rotations,
    get_surrounding_points, match_game, switch_colors, unpack_games,
};
use cfg_if::cfg_if;
use lru::LruCache;
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
    position_cache: LruCache<Vec<Placement>, Vec<SearchResult>>,
}

#[derive(Serialize, Deserialize)]
struct WasmSearchReturn {
    num_results: usize,
    results: Vec<SearchResult>,
}

#[wasm_bindgen]
impl WasmSearch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmSearch {
        let packed = include_bytes!("games.pack");
        let game_data = unpack_games(packed);
        let position_cache = LruCache::new(std::num::NonZeroUsize::new(1000).unwrap());
        Self {
            game_data,
            position_cache,
        }
    }

    #[wasm_bindgen]
    pub async fn search(&mut self, position: Uint8Array) -> Uint8Array {
        let position_buf: Vec<u8> = position.to_vec();
        let position_decoded: Vec<Placement> = serde_json::from_slice(position_buf.as_slice())
            .expect("Failed to deserialize position");
        let results = self.match_position(position_decoded);
        let num_results = results.len();
        let ret = WasmSearchReturn {
            num_results,
            results: results[0..num_results.min(10)].to_vec(),
        };
        let results_buf: Vec<u8> = serde_json::to_vec(&ret).expect("Failed to serialize results");
        Uint8Array::from(results_buf.as_slice())
    }

    fn match_position(&mut self, position: Vec<Placement>) -> Vec<SearchResult> {
        if position.is_empty() {
            return Vec::new();
        }
        if let Some(results) = self.position_cache.get(&position) {
            return results.clone();
        }
        let mut results = Vec::new();
        let rotations = get_rotations(&position);
        let inverse = switch_colors(&position);
        let inverse_rotations = get_rotations(&inverse);
        let mirrored = get_mirrored(&position);
        let mirrored_rotations = get_rotations(&mirrored);
        let mirrored_inverse = get_mirrored(&inverse);
        let mirrored_inverse_rotations = get_rotations(&mirrored_inverse);
        let is_within_one_quadrant = check_within_one_quadrant(&position);

        for (path, moves) in &self.game_data {
            // Original position
            let mut matched = match_game(&position, moves);
            if let Some(last_move_matched) = matched {
                results.push(SearchResult {
                    path: path.clone(),
                    score: 100,
                    last_move_matched,
                    rotation: 0,
                    is_inverted: false,
                    is_mirrored: false,
                    all_empty_correctly_within: 0,
                    moves: moves.clone(),
                });
                continue;
            }

            // Original rotations
            for (i, rotation) in rotations.iter().enumerate() {
                matched = match_game(rotation, moves);
                if let Some(last_move_matched) = matched {
                    results.push(SearchResult {
                        path: path.clone(),
                        score: 99,
                        last_move_matched,
                        rotation: (i + 1) as u8,
                        is_inverted: false,
                        is_mirrored: false,
                        all_empty_correctly_within: 0,
                        moves: moves.clone(),
                    });
                    break;
                }
            }

            {
                let mirrored_score = if is_within_one_quadrant { 100 } else { 10 };
                // Mirrored position
                if matched.is_none() {
                    matched = match_game(&mirrored, moves);
                    if let Some(last_move_matched) = matched {
                        results.push(SearchResult {
                            path: path.clone(),
                            score: mirrored_score,
                            last_move_matched,
                            rotation: 0,
                            is_inverted: false,
                            is_mirrored: true,
                            all_empty_correctly_within: 0,
                            moves: moves.clone(),
                        });
                        continue;
                    }
                }

                // Mirrored rotations
                if matched.is_none() {
                    for (i, rotation) in mirrored_rotations.iter().enumerate() {
                        matched = match_game(rotation, moves);
                        if let Some(last_move_matched) = matched {
                            results.push(SearchResult {
                                path: path.clone(),
                                score: mirrored_score - 1,
                                last_move_matched,
                                rotation: (i + 1) as u8,
                                is_inverted: false,
                                is_mirrored: true,
                                all_empty_correctly_within: 0,
                                moves: moves.clone(),
                            });
                            break;
                        }
                    }
                }
            }

            // Inverse colors position
            if matched.is_none() {
                matched = match_game(&inverse, moves);
                if let Some(last_move_matched) = matched {
                    results.push(SearchResult {
                        path: path.clone(),
                        score: 90,
                        last_move_matched,
                        rotation: 0,
                        is_inverted: true,
                        is_mirrored: false,
                        all_empty_correctly_within: 0,
                        moves: moves.clone(),
                    });
                    continue;
                }
            }

            // Inverse rotations
            if matched.is_none() {
                for (i, rotation) in inverse_rotations.iter().enumerate() {
                    matched = match_game(rotation, moves);
                    if let Some(last_move_matched) = matched {
                        results.push(SearchResult {
                            path: path.clone(),
                            score: 89,
                            last_move_matched,
                            rotation: (i + 1) as u8,
                            is_inverted: true,
                            is_mirrored: false,
                            all_empty_correctly_within: 0,
                            moves: moves.clone(),
                        });
                        break;
                    }
                }
            }

            {
                let mirrored_score = if is_within_one_quadrant { 90 } else { 9 };
                // Mirrored inverse position
                if matched.is_none() {
                    matched = match_game(&mirrored_inverse, moves);
                    if let Some(last_move_matched) = matched {
                        results.push(SearchResult {
                            path: path.clone(),
                            score: mirrored_score,
                            last_move_matched,
                            rotation: 0,
                            is_inverted: true,
                            is_mirrored: true,
                            all_empty_correctly_within: 0,
                            moves: moves.clone(),
                        });
                        continue;
                    }
                }

                // Mirrored inverse rotations
                if matched.is_none() {
                    for (i, rotation) in mirrored_inverse_rotations.iter().enumerate() {
                        matched = match_game(rotation, moves);
                        if let Some(last_move_matched) = matched {
                            results.push(SearchResult {
                                path: path.clone(),
                                score: mirrored_score - 1,
                                last_move_matched,
                                rotation: (i + 1) as u8,
                                is_inverted: true,
                                is_mirrored: true,
                                all_empty_correctly_within: 0,
                                moves: moves.clone(),
                            });
                            break;
                        }
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
            let mut all_empty_correctly_within = 0;
            for i in 1..=3 {
                let mut all_empty = true;
                for placement in position.clone() {
                    let mut surrounding = get_surrounding_points(&placement.point, i);
                    surrounding = surrounding
                        .iter()
                        .filter(|p| !position.iter().any(|m| m.point == **p))
                        .filter(|p| !checked.contains(*p))
                        .cloned()
                        .collect();
                    checked.extend(surrounding.iter().cloned());
                    if check_empty(&surrounding, truncated_moves) {
                        result.score += i as i16 * 3;
                    } else {
                        all_empty = false;
                        break;
                    }
                }
                if all_empty && (all_empty_correctly_within == i - 1) {
                    all_empty_correctly_within += 1;
                }
            }
            result.all_empty_correctly_within = all_empty_correctly_within;
            // all being empty around the position we are searching is very important, hence we multiply the score
            result.score *= 1 + all_empty_correctly_within as i16;
        }

        for result in &mut results {
            result.score -= result.last_move_matched as i16;
        }

        results.sort_by(|a, b| b.score.cmp(&a.score));

        self.position_cache.put(position, results.clone());

        results
    }
}

impl Default for WasmSearch {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SearchResult {
    path: String,
    score: i16,
    last_move_matched: usize,
    rotation: u8,                   // 0: no rotation, 1-3: rotation index
    is_inverted: bool,              // whether the colors were inverted
    is_mirrored: bool,              // whether the position was mirrored
    all_empty_correctly_within: u8, // distance from moves where all surrounding points are correctly empty
    moves: Vec<Placement>,          // the actual game moves
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiate() {
        let wasm_search = WasmSearch::new();
        assert!(!wasm_search.game_data.is_empty());
    }
}
