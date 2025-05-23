extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

pub mod errors;
pub mod sgf_traversal;

use cfg_if::cfg_if;
use sgf_parse::{go, go::Point, SgfNode, go::Prop::W, go::Move::Move};
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
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello,{}!", name));
}

pub enum Color {
    Black,
    White,
}

type BoardPosition = HashMap<Point, Color>;

pub fn point_in_game(sgf_nodes: Vec<SgfNode<go::Prop>>, point: Point) -> bool {
    false
}

pub fn position_in_game(sgf_nodes: Vec<SgfNode<go::Prop>>, position: BoardPosition) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load_sgfs() -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        sgf_folder.push("badukmovies-pro-collection");

        let mut all_data = Vec::new();
        //let entry = walkdir::WalkDir::new(sgf_folder)
        //    .into_iter()
        //    .filter_map(|e| e.ok())
        //    .filter(|e| e.path().extension().map_or(false, |ext| ext == "sgf"))
        //    .next()
        //    .ok_or_else(|| {
        //        std::io::Error::new(std::io::ErrorKind::NotFound, "No SGF files found")
        //    })?;
        //let file_data = std::fs::read_to_string(entry.path())?;
        //all_data.push(file_data);

        for entry in walkdir::WalkDir::new(sgf_folder)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "sgf"))
        {
            let file_data = std::fs::read_to_string(entry.path())?;
            all_data.push(file_data);
        }

        Ok(all_data)
    }

    fn parse_games(sgfs: Vec<String>) -> Vec<Vec<SgfNode<go::Prop>>> {
        let mut games: Vec<Vec<SgfNode<go::Prop>>> = Vec::new();

        for sgf in sgfs {
            if let Ok(nodes) = go::parse(&sgf) {
                games.push(nodes);
            }
        }

        games
    }

    #[test]
    fn test_load_sgf() {
        let sgfs = load_sgfs().unwrap();
        let games = parse_games(sgfs);
        let point = Point{x: 3, y: 3};
        //let color = Color::Black;
        for game in games {
            for node in sgf_traversal::variation_nodes(&game[0], 0).unwrap() {
                match node.sgf_node {
                    SgfNode { properties, .. } if properties.contains(&W(Move(point))) => {
                        println!("White move at {:?}", point);
                    }
                    _ => {}
                }
            }
        }
    }
}
