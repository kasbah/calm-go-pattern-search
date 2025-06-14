mod sgf_traversal;

use rayon::prelude::*;
use serde_json::Value;
use sgf_parse::go;
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;

use calm_go_patterns_common::baduk::{
    BOARD_SIZE, Color, Game, GameResult, GoBoard, Placement, Point, Rank, get_rotations,
    pack_games, parse_komi, parse_rank, parse_rules, parse_sgf_date, parse_sgf_result,
};

fn load_player_aliases() -> HashMap<String, i16> {
    let mut aliases = HashMap::new();
    let file = File::open("python-player-name-aliases/player_names.json")
        .expect("Failed to open player names file");
    let reader = BufReader::new(file);
    let json: Value = serde_json::from_reader(reader).expect("Failed to parse player names JSON");

    for (canonical_name, data) in json.as_object().expect("Expected object").iter() {
        // Add the canonical name itself as an alias
        let id = data
            .get("id")
            .expect("Missing id")
            .as_i64()
            .expect("Expected id to be an integer") as i16;
        aliases.insert(canonical_name.to_lowercase(), id);

        // Add all aliases
        if let Some(aliases_array) = data.get("aliases").and_then(|a| a.as_array()) {
            for alias in aliases_array {
                if let Some(name) = alias.get("name").and_then(|n| n.as_str()) {
                    aliases.insert(name.to_lowercase(), id);
                }
            }
        }
    }
    aliases
}

fn find_player_id(
    name: &str,
    aliases: &HashMap<String, i16>,
    unknown_names: &mut HashSet<String>,
) -> Option<i16> {
    let name = name.replace(['\n'], " ").trim().to_string();

    if name.is_empty() {
        return None;
    }

    if let Some(id) = aliases.get(name.to_lowercase().as_str()) {
        return Some(*id);
    }

    unknown_names.insert(name.to_string());
    None
}

fn main() {
    let player_aliases = load_player_aliases();
    let mut unknown_names = HashSet::new();
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
                Ok((mut game, player_black, player_white)) => {
                    // Replace player names with canonical names
                    let mut local_unknown = HashSet::new();
                    game.player_black =
                        find_player_id(&player_black, &player_aliases, &mut local_unknown);
                    game.player_white =
                        find_player_id(&player_white, &player_aliases, &mut local_unknown);
                    let rel_path = path
                        .strip_prefix(&sgf_folder)
                        .unwrap()
                        .with_extension("")
                        .to_string_lossy()
                        .into_owned();
                    Some((rel_path, game, local_unknown))
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

    // Merge unknown names from all games
    for (_, _, local_unknown) in &games_vec {
        unknown_names.extend(local_unknown.iter().cloned());
    }

    let games_vec = games_vec
        .into_iter()
        .map(|(path, game, _)| (path, game))
        .collect::<Vec<_>>();

    let mut seen_moves =
        HashMap::<Vec<Placement>, (Option<i16>, String, Option<i16>, String, GameResult)>::new();
    let mut unique_moves = HashMap::new();

    println!("Processing games...");
    for (path, game) in games_vec {
        let mut is_duplicate = false;
        let mut duplicate_info = None;
        if let Some((pb, rb, pw, rw, existing_result)) = seen_moves.get(&game.moves) {
            is_duplicate = true;
            // Keep the game with better score information
            match (&existing_result, &game.result) {
                // If existing is Unknown and new is not, keep the new one
                (GameResult::Unknown(_), _) => {
                    seen_moves.insert(
                        game.moves.clone(),
                        (
                            game.player_black,
                            game.rank_black.to_string(),
                            game.player_white,
                            game.rank_white.to_string(),
                            game.result.clone(),
                        ),
                    );
                    unique_moves.insert(path.clone(), game.clone());
                }
                // If both are Player results, keep the one with Some(Score)
                (GameResult::Player(_, None, _), GameResult::Player(_, Some(_), _)) => {
                    seen_moves.insert(
                        game.moves.clone(),
                        (
                            game.player_black,
                            game.rank_black.to_string(),
                            game.player_white,
                            game.rank_white.to_string(),
                            game.result.clone(),
                        ),
                    );
                    unique_moves.insert(path.clone(), game.clone());
                }
                // Otherwise keep the existing one
                _ => {
                    duplicate_info = Some((*pb, rb.clone(), *pw, rw.clone()));
                }
            }
        } else {
            for (_, rotated_moves) in get_rotations(&game.moves) {
                if let Some((pb, rb, pw, rw, existing_result)) = seen_moves.get(&rotated_moves) {
                    is_duplicate = true;
                    // Keep the game with better score information
                    match (&existing_result, &game.result) {
                        // If existing is Unknown and new is not, keep the new one
                        (GameResult::Unknown(_), _) => {
                            seen_moves.insert(
                                game.moves.clone(),
                                (
                                    game.player_black,
                                    game.rank_black.to_string(),
                                    game.player_white,
                                    game.rank_white.to_string(),
                                    game.result.clone(),
                                ),
                            );
                            unique_moves.insert(path.clone(), game.clone());
                            break;
                        }
                        // If both are Player results, keep the one with Some(Score)
                        (GameResult::Player(_, None, _), GameResult::Player(_, Some(_), _)) => {
                            seen_moves.insert(
                                game.moves.clone(),
                                (
                                    game.player_black,
                                    game.rank_black.to_string(),
                                    game.player_white,
                                    game.rank_white.to_string(),
                                    game.result.clone(),
                                ),
                            );
                            unique_moves.insert(path.clone(), game.clone());
                            break;
                        }
                        // Otherwise keep the existing one
                        _ => {
                            duplicate_info = Some((*pb, rb.clone(), *pw, rw.clone()));
                            break;
                        }
                    }
                }
            }
        }

        if !is_duplicate {
            seen_moves.insert(
                game.moves.clone(),
                (
                    game.player_black,
                    game.rank_black.to_string(),
                    game.player_white,
                    game.rank_white.to_string(),
                    game.result.clone(),
                ),
            );
            unique_moves.insert(path.clone(), game.clone());
        } else if let Some((pb, rb, pw, rw)) = duplicate_info {
            // Only warn if player IDs don't match
            if game.player_black != pb || game.player_white != pw {
                println!(
                    "Removing duplicate game: {:?} {} vs {:?} {} (duplicate of {:?} {} vs {:?} {})",
                    game.player_black,
                    game.rank_black,
                    game.player_white,
                    game.rank_white,
                    pb,
                    rb,
                    pw,
                    rw
                );
            }
        }
    }

    println!("Found {} unique games", unique_moves.len());

    println!("Computing captures...");

    let games = unique_moves
        .into_par_iter()
        .map(|(path, mut game)| {
            let mut captures = HashMap::new();
            let mut gb = GoBoard::new();

            for (i, move_) in game.moves.iter().enumerate() {
                let cs = gb.make_move(move_);
                if !cs.is_empty() {
                    captures.insert(i, cs);
                }
            }
            game.captures = captures;
            (path, game)
        })
        .collect();

    println!("Writing games.pack...");
    let buf = pack_games(&games);
    std::fs::write("games.pack", buf).unwrap();

    // Write unknown names to file
    println!("Writing unknown_names.txt...");
    let mut unknown_names: Vec<_> = unknown_names.into_iter().collect();
    unknown_names.sort();
    std::fs::write("unknown_names.txt", unknown_names.join("\n")).unwrap();
    println!("Done");
}

fn load_sgf(
    path: &PathBuf,
    file_data: &str,
) -> Result<(Game, String, String), Box<dyn std::error::Error>> {
    let game = go::parse(file_data)?;
    let mut moves = Vec::new();
    let mut event = String::new();
    let mut round = String::new();
    let mut location = String::new();
    let mut date = None;
    let mut player_black = String::new();
    let mut player_white = String::new();
    let mut rank_black = Rank::Custom("".to_string());
    let mut rank_white = Rank::Custom("".to_string());
    let mut komi = None;
    let mut result = GameResult::Unknown("".to_string());
    let mut rules = None;

    // Extract metadata from root node
    for prop in &game[0].properties {
        match prop {
            go::Prop::EV(e) => event = e.text.to_string(),
            go::Prop::RO(r) => round = r.text.to_string(),
            go::Prop::PC(p) => location = p.text.to_string(),
            go::Prop::DT(d) => date = Some(parse_sgf_date(&d.text)),
            go::Prop::PB(p) => player_black = p.text.to_string(),
            go::Prop::PW(p) => player_white = p.text.to_string(),
            go::Prop::BR(r) => rank_black = parse_rank(&r.text),
            go::Prop::WR(r) => rank_white = parse_rank(&r.text),
            go::Prop::KM(k) => komi = parse_komi(&k.to_string()),
            go::Prop::RE(r) => result = parse_sgf_result(&r.text),
            go::Prop::RU(r) => rules = Some(parse_rules(&r.text)),
            _ => {}
        }
    }

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
                go::Prop::AB(points) => {
                    for point in points {
                        if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                            println!(
                                "Skipping handicap placement greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                            );
                            continue;
                        }
                        moves.push(Placement {
                            color: Color::Black,
                            point: Point {
                                x: point.x,
                                y: point.y,
                            },
                        });
                    }
                }
                go::Prop::AW(points) => {
                    for point in points {
                        if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                            println!(
                                "Skipping handicap placement greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                            );
                            continue;
                        }
                        moves.push(Placement {
                            color: Color::White,
                            point: Point {
                                x: point.x,
                                y: point.y,
                            },
                        });
                    }
                }
                _ => {}
            }
        }
    }

    Ok((
        Game {
            event,
            round,
            location,
            date,
            player_black: None,
            player_white: None,
            rank_black,
            rank_white,
            komi,
            result,
            rules,
            moves,
            captures: HashMap::new(),
        },
        player_black,
        player_white,
    ))
}
