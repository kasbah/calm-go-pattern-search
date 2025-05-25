extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

pub mod errors;
pub mod sgf_traversal;

use calm_go_patterns_common::baduk::{
    Placement, check_empty, get_rotations, get_surrounding_points, match_game, switch_colors,
};
use cfg_if::cfg_if;
use rmp_serde::Deserializer;
use serde::Deserialize;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

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
        let data = include_bytes!("games.pack");
        let mut de = Deserializer::new(&data[..]);
        let game_data: HashMap<String, Vec<Placement>> = Deserialize::deserialize(&mut de).unwrap();
        Self { game_data }
    }

    #[wasm_bindgen]
    pub async fn search(&self, position: Vec<Placement>) -> Vec<SearchResult> {
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

#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SearchResult {
    path: String,
    score: i16,
    last_move_matched: usize,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(getter)]
    pub fn path(&self) -> String {
        self.path.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn score(&self) -> i16 {
        self.score
    }
    #[wasm_bindgen(getter)]
    pub fn last_move_matched(&self) -> usize {
        self.last_move_matched
    }
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

//#[cfg(test)]
//mod tests {
//    use super::*;
//
//    fn load_sgfs() -> Result<HashMap<String, Vec<Move>>, Box<dyn std::error::Error>> {
//        let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//        sgf_folder.push("badukmovies-pro-collection");
//
//        let mut games = HashMap::new();
//
//        for entry in jwalk::WalkDir::new(sgf_folder) {
//            let path = entry?.path();
//            if path.extension().map_or(false, |ext| ext == "sgf") {
//                let file_data = std::fs::read_to_string(path.clone())?;
//                if let Ok(game) = go::parse(&file_data) {
//                    let mut moves = Vec::new();
//                    for node in sgf_traversal::variation_nodes(&game[0], 0).unwrap() {
//                        for props in &node.sgf_node.properties {
//                            match props {
//                                go::Prop::W(go::Move::Move(point)) => {
//                                    moves.push(Move {
//                                        color: Color::White,
//                                        point: point.clone(),
//                                    });
//                                    break;
//                                }
//                                go::Prop::B(go::Move::Move(point)) => {
//                                    moves.push(Move {
//                                        color: Color::Black,
//                                        point: point.clone(),
//                                    });
//                                    break;
//                                }
//                                _ => {}
//                            }
//                        }
//                    }
//
//                    games.insert(path.to_string_lossy().into_owned(), moves);
//                }
//            }
//        }
//
//        Ok(games)
//    }
//
//    //#[test]
//    //fn test_load_sgf() {
//    //    let games = load_sgfs().unwrap();
//    //    let mut buf = Vec::new();
//    //    games.serialize(&mut Serializer::new(&mut buf)).unwrap();
//    //    std::fs::write("games.pack", buf).unwrap();
//    //    //let point = Point { x: 3, y: 3 };
//    //    //let color = Color::White;
//    //    //for (path, moves) in games {
//    //    //    for move_ in moves {
//    //    //        if move_.point == point && move_.color == color {
//    //    //            println!("{:?}", path);
//    //    //            break;
//    //    //        }
//    //    //    }
//    //    //}
//    //}
//    #[test]
//    fn test_load_pack() {
//        let data = include_bytes!("games.pack");
//        let mut de = Deserializer::new(&data[..]);
//        let games: HashMap<String, Vec<Move>> = Deserialize::deserialize(&mut de).unwrap();
//        assert!(!games.is_empty());
//        let point = Point { x: 3, y: 3 };
//        let color = Color::White;
//        for (path, moves) in games {
//            for move_ in moves {
//                if move_.point == point && move_.color == color {
//                    println!("{:?}", path);
//                    break;
//                }
//            }
//        }
//    }
//}
