mod sgf_traversal;

use rayon::prelude::*;
use sgf_parse::go;
use std::collections::HashMap;
use std::path::PathBuf;

use calm_go_patterns_common::baduk::{
    BOARD_SIZE, Color, Game, GoBoard, Placement, Point, get_rotations, pack_games,
};

fn main() {
    let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    sgf_folder.push("sgfs");
    let mut paths = Vec::new();

    println!("Loading games...");
    for entry in jwalk::WalkDir::new(&sgf_folder) {
        let path = entry.expect("Failed to read directory entry").path();
        if path.extension().is_some_and(|ext| ext == "sgf") {
            paths.push(path.clone());
        }
    }
    println!("Read directories");

    let games_vec = paths
        .par_iter()
        .filter_map(|path| match std::fs::read_to_string(path) {
            Ok(file_data) => match load_sgf(path, &file_data) {
                Ok(moves) => {
                    let rel_path = path
                        .strip_prefix(&sgf_folder)
                        .unwrap()
                        .with_extension("")
                        .to_string_lossy()
                        .into_owned();
                    Some((rel_path, moves))
                }
                Err(e) => {
                    println!("Skipping {path:?}: {e}");
                    None
                }
            },
            Err(e) => {
                println!("Skipping {path:?}: {e}");
                None
            }
        })
        .collect::<Vec<_>>();

    let mut seen_moves = HashMap::<Vec<Placement>, bool>::new();
    let mut unique_moves = HashMap::new();

    for (path, moves) in games_vec {
        let mut is_duplicate = false;
        if seen_moves.contains_key(&moves) {
            is_duplicate = true;
        } else {
            for (_, rotated_moves) in get_rotations(&moves) {
                if seen_moves.contains_key(&rotated_moves) {
                    is_duplicate = true;
                    break;
                }
            }
        }

        if !is_duplicate {
            seen_moves.insert(moves.clone(), true);
            unique_moves.insert(path, moves);
        } else {
            println!("Removing duplicate game: {path}");
        }
    }

    println!("Found {} unique games", unique_moves.len());

    let games = unique_moves
        .par_iter()
        .map(|(path, moves)| {
            let mut captures = HashMap::new();
            let mut gb = GoBoard::new();

            for (i, move_) in moves.iter().enumerate() {
                let cs = gb.make_move(move_);
                if !cs.is_empty() {
                    captures.insert(i, cs);
                }
            }
            (
                path.clone(),
                Game {
                    moves: moves.clone(),
                    captures,
                },
            )
        })
        .collect();

    println!("Writing games.pack...");
    let buf = pack_games(&games);
    std::fs::write("games.pack", buf).unwrap();
    println!("Done");
}

fn load_sgf(path: &PathBuf, file_data: &str) -> Result<Vec<Placement>, Box<dyn std::error::Error>> {
    let game = go::parse(file_data)?;
    let mut moves = Vec::new();

    if let Some(go::Prop::SZ(size)) = game[0]
        .properties
        .iter()
        .find(|p| matches!(p, go::Prop::SZ(_)))
    {
        if *size != (BOARD_SIZE, BOARD_SIZE) {
            return Err(
                format!("Got non-{BOARD_SIZE:?}x{BOARD_SIZE:?} board size: {size:?}").into(),
            );
        }
    }

    for node in sgf_traversal::variation_nodes(&game[0], 0)? {
        for props in &node.sgf_node.properties {
            match props {
                go::Prop::W(go::Move::Move(point)) => {
                    if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                        println!(
                            "Skipping move greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                        );
                        break;
                    }
                    moves.push(Placement {
                        color: Color::White,
                        point: Point {
                            x: point.x,
                            y: point.y,
                        },
                    });
                    break;
                }
                go::Prop::B(go::Move::Move(point)) => {
                    if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                        println!(
                            "Skipping move greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                        );
                        break;
                    }
                    moves.push(Placement {
                        color: Color::Black,
                        point: Point {
                            x: point.x,
                            y: point.y,
                        },
                    });
                    break;
                }
                _ => {}
            }
        }
    }

    Ok(moves)
}
