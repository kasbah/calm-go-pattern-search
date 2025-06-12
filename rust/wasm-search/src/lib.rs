extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

use calm_go_patterns_common::baduk::{
    Color, Game, Placement, Point, Rotation, check_empty, check_within_one_quadrant, get_mirrored,
    get_rotated, get_rotations, get_surrounding_points, match_game, switch_colors, unpack_games,
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

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SearchResult {
    path: String,
    score: i16,
    last_move_matched: usize,
    rotation: u8,                      // 0: no rotation, 1-3: rotation index
    is_inverted: bool,                 // whether the colors were inverted
    is_mirrored: bool,                 // whether the position was mirrored
    all_empty_correctly_within: u8, // distance from moves where all surrounding points are correctly empty
    moves: Vec<Placement>,          // the actual game moves
    moves_transformed: Vec<Placement>, // the moves rotated and/or mirrored
}

fn get_moves_rotation(query_rotation: &Rotation) -> Rotation {
    // rotating the moves the opposite to the query position
    match query_rotation {
        Rotation::Degrees90 => Rotation::Degrees270,
        Rotation::Degrees270 => Rotation::Degrees90,
        _ => *query_rotation,
    }
}

fn get_rotation_index(r: &Rotation) -> u8 {
    match r {
        Rotation::Degrees90 => 1,
        Rotation::Degrees180 => 2,
        Rotation::Degrees270 => 3,
    }
}

fn get_next_moves(
    results: &[SearchResult],
    position: &[Placement],
    next_color: Color,
) -> Vec<Point> {
    let mut next_moves_map: HashMap<Placement, usize> = HashMap::new();
    let moves_ahead = 2;
    for result in results {
        let mut mult: usize = if result.last_move_matched == position.len() - 1 {
            100
        } else {
            1
        };
        mult *= result.all_empty_correctly_within as usize;
        if mult > 0 {
            for i in 1..=moves_ahead {
                if let Some(move_) = result.moves_transformed.get(result.last_move_matched + i) {
                    if !position.iter().any(|m| m.point == move_.point) {
                        let mut move_ = *move_;
                        if result.is_inverted {
                            move_.color = if move_.color == Color::White {
                                Color::Black
                            } else {
                                Color::White
                            };
                        }
                        if let Some(n) = next_moves_map.get(&move_) {
                            next_moves_map.insert(move_, n + mult + moves_ahead - i);
                        } else {
                            next_moves_map.insert(move_, mult + moves_ahead - i);
                        }
                    }
                }
            }
        }
    }

    let next_placements = next_moves_map.iter().collect::<Vec<_>>();
    let mut next_moves = next_placements
        .into_iter()
        .filter(|(m, _)| m.color == next_color)
        .collect::<Vec<_>>();

    next_moves.sort_by(|a, b| b.1.cmp(a.1));
    next_moves.into_iter().map(|(m, _)| m.point).collect()
}

#[wasm_bindgen]
pub struct WasmSearch {
    game_data: HashMap<String, Game>,
    position_cache: LruCache<Vec<Placement>, Vec<SearchResult>>,
}

#[derive(Serialize, Deserialize)]
struct WasmSearchReturn {
    num_results: usize,
    next_moves: Vec<Point>,
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
    pub async fn search(&mut self, position: Uint8Array, next_color: u8) -> Uint8Array {
        let position_buf: Vec<u8> = position.to_vec();
        let position_decoded: Vec<Placement> = serde_json::from_slice(position_buf.as_slice())
            .expect("Failed to deserialize position");
        let results = self.match_position(&position_decoded);

        let next_color = if next_color == 0 {
            Color::Black
        } else {
            Color::White
        };
        let next_moves = get_next_moves(&results, &position_decoded, next_color);

        let num_results = results.len();
        let ret = WasmSearchReturn {
            num_results,
            next_moves: next_moves[0..next_moves.len().min(9)].to_vec(),
            results: results[0..num_results.min(10)].to_vec(),
        };

        let results_buf: Vec<u8> = serde_json::to_vec(&ret).expect("Failed to serialize results");
        Uint8Array::from(results_buf.as_slice())
    }

    fn match_position(&mut self, position: &[Placement]) -> Vec<SearchResult> {
        if let Some(results) = self.position_cache.get(&position.to_vec()) {
            return results.clone();
        }
        if position.is_empty() {
            let mut results = Vec::new();
            for (path, game) in &self.game_data {
                results.push(SearchResult {
                    path: path.clone(),
                    score: 0,
                    last_move_matched: 0,
                    rotation: 0,
                    is_inverted: false,
                    is_mirrored: false,
                    all_empty_correctly_within: 0,
                    moves: game.moves.clone(),
                    moves_transformed: game.moves.clone(),
                });
            }
            self.position_cache.put(position.to_vec(), results.clone());
            return results;
        }
        let mut results = Vec::new();
        let rotations = get_rotations(position);
        let inverse = switch_colors(position);
        let inverse_rotations = get_rotations(&inverse);
        let mirrored = get_mirrored(position);
        let mirrored_rotations = get_rotations(&mirrored);
        let mirrored_inverse = get_mirrored(&inverse);
        let mirrored_inverse_rotations = get_rotations(&mirrored_inverse);
        let is_within_one_quadrant = check_within_one_quadrant(position);

        for (path, game) in &self.game_data {
            // Original position
            let mut matched = match_game(position, &game.moves);
            if let Some(last_move_matched) = matched {
                results.push(SearchResult {
                    path: path.clone(),
                    score: 100,
                    last_move_matched,
                    rotation: 0,
                    is_inverted: false,
                    is_mirrored: false,
                    all_empty_correctly_within: 0,
                    moves: game.moves.clone(),
                    moves_transformed: game.moves.clone(),
                });
                continue;
            }

            // Original rotations
            for (r, rotated_position) in rotations.clone() {
                matched = match_game(&rotated_position, &game.moves);
                if let Some(last_move_matched) = matched {
                    let moves_rotation = get_moves_rotation(&r);
                    results.push(SearchResult {
                        path: path.clone(),
                        score: 99,
                        last_move_matched,
                        rotation: get_rotation_index(&r),
                        is_inverted: false,
                        is_mirrored: false,
                        all_empty_correctly_within: 0,
                        moves: game.moves.clone(),
                        moves_transformed: get_rotated(&game.moves, &moves_rotation),
                    });
                    break;
                }
            }

            {
                let mirrored_score = if is_within_one_quadrant { 100 } else { 10 };
                // Mirrored position
                if matched.is_none() {
                    matched = match_game(&mirrored, &game.moves);
                    if let Some(last_move_matched) = matched {
                        results.push(SearchResult {
                            path: path.clone(),
                            score: mirrored_score,
                            last_move_matched,
                            rotation: 0,
                            is_inverted: false,
                            is_mirrored: true,
                            all_empty_correctly_within: 0,
                            moves: game.moves.clone(),
                            moves_transformed: get_mirrored(&game.moves),
                        });
                        continue;
                    }
                }

                // Mirrored rotations
                if matched.is_none() {
                    for (r, rotated_position) in mirrored_rotations.clone() {
                        matched = match_game(&rotated_position, &game.moves);
                        if let Some(last_move_matched) = matched {
                            results.push(SearchResult {
                                path: path.clone(),
                                score: mirrored_score - 1,
                                last_move_matched,
                                rotation: get_rotation_index(&r),
                                is_inverted: false,
                                is_mirrored: true,
                                all_empty_correctly_within: 0,
                                moves: game.moves.clone(),
                                moves_transformed: get_rotated(&get_mirrored(&game.moves), &r),
                            });
                            break;
                        }
                    }
                }
            }

            // Inverse colors position
            if matched.is_none() {
                matched = match_game(&inverse, &game.moves);
                if let Some(last_move_matched) = matched {
                    results.push(SearchResult {
                        path: path.clone(),
                        score: 90,
                        last_move_matched,
                        rotation: 0,
                        is_inverted: true,
                        is_mirrored: false,
                        all_empty_correctly_within: 0,
                        moves: game.moves.clone(),
                        moves_transformed: game.moves.clone(),
                    });
                    continue;
                }
            }

            // Inverse rotations
            if matched.is_none() {
                for (r, rotated_position) in inverse_rotations.clone() {
                    matched = match_game(&rotated_position, &game.moves);
                    if let Some(last_move_matched) = matched {
                        let moves_rotation = get_moves_rotation(&r);
                        results.push(SearchResult {
                            path: path.clone(),
                            score: 89,
                            last_move_matched,
                            rotation: get_rotation_index(&r),
                            is_inverted: true,
                            is_mirrored: false,
                            all_empty_correctly_within: 0,
                            moves: game.moves.clone(),
                            moves_transformed: get_rotated(&game.moves, &moves_rotation),
                        });
                        break;
                    }
                }
            }

            {
                let mirrored_score = if is_within_one_quadrant { 90 } else { 9 };
                // Mirrored inverse position
                if matched.is_none() {
                    matched = match_game(&mirrored_inverse, &game.moves);
                    if let Some(last_move_matched) = matched {
                        results.push(SearchResult {
                            path: path.clone(),
                            score: mirrored_score,
                            last_move_matched,
                            rotation: 0,
                            is_inverted: true,
                            is_mirrored: true,
                            all_empty_correctly_within: 0,
                            moves: game.moves.clone(),
                            moves_transformed: get_mirrored(&game.moves),
                        });
                        continue;
                    }
                }

                // Mirrored inverse rotations
                if matched.is_none() {
                    for (r, rotated_position) in mirrored_inverse_rotations.clone() {
                        matched = match_game(&rotated_position, &game.moves);
                        if let Some(last_move_matched) = matched {
                            results.push(SearchResult {
                                path: path.clone(),
                                score: mirrored_score - 1,
                                last_move_matched,
                                rotation: get_rotation_index(&r),
                                is_inverted: true,
                                is_mirrored: true,
                                all_empty_correctly_within: 0,
                                moves: game.moves.clone(),
                                moves_transformed: get_rotated(&get_mirrored(&game.moves), &r),
                            });
                            break;
                        }
                    }
                }
            }
        }
        for result in &mut results {
            let truncated_moves = &result.moves_transformed[..result.last_move_matched];
            let mut checked = Vec::new();
            let mut all_empty_correctly_within = 0;
            let captures: Vec<Point> = self
                .game_data
                .get(&result.path)
                .expect("Inconsistent game data")
                .captures
                .iter()
                .filter(|(move_number, _)| move_number <= &&result.last_move_matched)
                .flat_map(|(_, cs)| cs.iter().map(|c| c.point))
                .collect::<Vec<_>>();

            for i in 1..=3 {
                let mut all_empty = true;
                for placement in position {
                    let mut surrounding = get_surrounding_points(&placement.point, i);
                    surrounding = surrounding
                        .iter()
                        .filter(|p| !position.iter().any(|m| m.point == **p))
                        .filter(|p| !checked.contains(*p))
                        .filter(|p| !captures.contains(*p))
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
            // all being empty around the position we are searching is very important, hence we
            // multiply the score
            result.score *= 1 + all_empty_correctly_within as i16;
        }

        for result in &mut results {
            result.score -= result.last_move_matched as i16;
        }

        results.sort_by(|a, b| b.score.cmp(&a.score));
        results.sort_by(|a, b| {
            (a.last_move_matched * (3 - a.all_empty_correctly_within as usize))
                .cmp(&(b.last_move_matched * (3 - b.all_empty_correctly_within as usize)))
        });

        self.position_cache.put(position.to_vec(), results.clone());

        results
    }
}

impl Default for WasmSearch {
    fn default() -> Self {
        Self::new()
    }
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
