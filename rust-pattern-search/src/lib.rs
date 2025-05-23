extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

pub mod errors;
pub mod sgf_traversal;

use cfg_if::cfg_if;
use sgf_parse::{go, go::Point, SgfNode};
use std::collections::HashMap;
use std::path::Path;
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
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello,{}!", name));
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Color {
    Black,
    White,
}

type BoardPosition = HashMap<Point, Color>;

pub struct Move {
    color: Color,
    point: Point,
}

pub fn point_in_game(sgf_nodes: Vec<SgfNode<go::Prop>>, point: Point) -> bool {
    false
}

pub fn position_in_game(sgf_nodes: Vec<SgfNode<go::Prop>>, position: BoardPosition) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load_sgfs() -> Result<HashMap<String, Vec<Move>>, Box<dyn std::error::Error>> {
        let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        sgf_folder.push("badukmovies-pro-collection");

        let mut games = HashMap::new();

        for entry in jwalk::WalkDir::new(sgf_folder) {
            let path = entry?.path();
            if path.extension().map_or(false, |ext| ext == "sgf") {
                let file_data = std::fs::read_to_string(path.clone())?;
                if let Ok(game) = go::parse(&file_data) {
                    let mut moves = Vec::new();
                    for node in sgf_traversal::variation_nodes(&game[0], 0).unwrap() {
                        for props in &node.sgf_node.properties {
                            match props {
                                go::Prop::W(go::Move::Move(point)) => {
                                    moves.push(Move {
                                        color: Color::White,
                                        point: point.clone(),
                                    });
                                    break;
                                }
                                go::Prop::B(go::Move::Move(point)) => {
                                    moves.push(Move {
                                        color: Color::Black,
                                        point: point.clone(),
                                    });
                                    break;
                                }
                                _ => {}
                            }
                        }
                    }

                    games.insert(path.to_string_lossy().into_owned(), moves);
                }
            }
        }

        Ok(games)
    }

    fn parse_games(sgfs: &mut HashMap<String, String>) -> HashMap<String, Vec<SgfNode<go::Prop>>> {
        let mut games: HashMap<String, Vec<SgfNode<go::Prop>>> = HashMap::new();

        for (path, sgf) in sgfs.into_iter() {
            if let Ok(game) = go::parse(&sgf) {
                games.insert(path.to_owned(), game);
            }
        }

        games
    }

    #[test]
    fn test_load_sgf() {
        let games = load_sgfs().unwrap();
        let point = Point { x: 3, y: 3 };
        let color = Color::White;
        for (path, moves) in games {
            for move_ in moves {
                if move_.point == point && move_.color == color {
                    println!("{:?}", path);
                    break;
                }
            }
        }
    }
}
