use bit_vec::BitVec;
use rmp_serde::{Deserializer, Serializer};
use serde::{Deserialize, Serialize};
use serde_bytes;
use std::collections::HashMap;
use std::collections::HashSet;
use std::fmt;

pub const BOARD_SIZE: u8 = 19;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Ord, PartialOrd)]
pub enum SgfDate {
    YearMonthDay(u16, u8, u8),
    YearMonth(u16, u8),
    Year(u16),
    Custom(String),
}

pub fn parse_sgf_date(date_str: &str) -> SgfDate {
    let date_str = date_str.trim();
    // Split on space and take only the date portion if there's a time
    let date_str = date_str.split_whitespace().next().unwrap_or(date_str);
    // Split on comma and take only the first date if there's a range
    let date_str = date_str.split(',').next().unwrap_or(date_str);

    // Try to parse YYYY-MM-DD or YYYY-MM format
    if let Some((year_str, rest)) = date_str.split_once('-') {
        if let Ok(year) = year_str.parse::<u16>() {
            if let Some((month_str, day_str)) = rest.split_once('-') {
                if let Ok(month) = month_str.parse::<u8>() {
                    if let Ok(day) = day_str.parse::<u8>() {
                        if (1..=12).contains(&month) && (1..=31).contains(&day) {
                            return SgfDate::YearMonthDay(year, month, day);
                        }
                    }
                }
            } else if let Ok(month) = rest.parse::<u8>() {
                if (1..=12).contains(&month) {
                    return SgfDate::YearMonth(year, month);
                }
            }
        }
    }

    // Try to parse just the year
    if let Ok(year) = date_str.parse::<u16>() {
        return SgfDate::Year(year);
    }

    SgfDate::Custom(date_str.to_string())
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Score {
    Resignation,
    Timeout,
    Forfeit,
    Points(f32),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum GameResult {
    Player(Color, Option<Score>, String),
    Draw,
    Void,
    Unknown(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Ord, PartialOrd)]
pub enum Color {
    Black,
    White,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Ord, PartialOrd)]
pub struct Point {
    pub x: u8,
    pub y: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Ord, PartialOrd)]
pub struct Placement {
    pub color: Color,
    pub point: Point,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Rotation {
    Degrees90,
    Degrees180,
    Degrees270,
}

pub fn get_rotated(position: &[Placement], rotation: &Rotation) -> Vec<Placement> {
    match rotation {
        Rotation::Degrees90 => position
            .iter()
            .map(|p| Placement {
                color: p.color,
                point: Point {
                    x: BOARD_SIZE - p.point.y - 1,
                    y: p.point.x,
                },
            })
            .collect(),
        Rotation::Degrees180 => position
            .iter()
            .map(|p| Placement {
                color: p.color,
                point: Point {
                    x: BOARD_SIZE - p.point.x - 1,
                    y: BOARD_SIZE - p.point.y - 1,
                },
            })
            .collect(),
        Rotation::Degrees270 => position
            .iter()
            .map(|p| Placement {
                color: p.color,
                point: Point {
                    x: p.point.y,
                    y: BOARD_SIZE - p.point.x - 1,
                },
            })
            .collect(),
    }
}

pub fn all_rotations(position: &[Placement]) -> Vec<Vec<Placement>> {
    let mut result = Vec::new();
    result.push(position.to_vec());
    for rotation in [
        Rotation::Degrees90,
        Rotation::Degrees180,
        Rotation::Degrees270,
    ] {
        result.push(get_rotated(position, &rotation));
    }
    result
}

pub fn get_rotations(position: &[Placement]) -> HashMap<Rotation, Vec<Placement>> {
    let mut result = HashMap::new();
    for rotation in [
        Rotation::Degrees90,
        Rotation::Degrees180,
        Rotation::Degrees270,
    ] {
        result.insert(rotation, get_rotated(position, &rotation));
    }
    result
}

pub fn get_mirrored(position: &[Placement]) -> Vec<Placement> {
    position
        .iter()
        .map(|p| Placement {
            color: p.color,
            point: Point {
                x: BOARD_SIZE - p.point.x - 1,
                y: p.point.y,
            },
        })
        .collect()
}

pub fn switch_colors(position: &[Placement]) -> Vec<Placement> {
    position
        .iter()
        .map(|p| Placement {
            color: if p.color == Color::White {
                Color::Black
            } else {
                Color::White
            },
            point: p.point,
        })
        .collect()
}

pub fn match_game(position: &[Placement], moves: &[Placement]) -> Option<usize> {
    let mut last_move_matched: usize = 0;
    for placement in position {
        let index = moves.iter().position(|&m| m == *placement)?;
        last_move_matched = std::cmp::max(index, last_move_matched);
    }
    Some(last_move_matched)
}

pub fn check_empty(empty: &[Point], moves: &[Placement]) -> bool {
    for placement in moves {
        if empty.contains(&placement.point) {
            return false;
        }
    }
    true
}

pub fn get_surrounding_points(point: &Point, range: u8) -> Vec<Point> {
    let mut result = Vec::new();
    let px = point.x as i8;
    let py = point.y as i8;
    let board_size = BOARD_SIZE as i8;
    let r = range as i8;
    for x in (px - r)..=(px + r) {
        for y in (py - r)..=(py + r) {
            if x >= 0 && x < board_size && y >= 0 && y < board_size && (px != x || py != y) {
                result.push(Point {
                    x: x as u8,
                    y: y as u8,
                });
            }
        }
    }
    result
}

pub fn pack_placements(placements: &[Placement]) -> Vec<u8> {
    let points: Vec<u16> = placements
        .iter()
        .map(|p| p.point.x as u16 * BOARD_SIZE as u16 + p.point.y as u16)
        .collect();

    let mut point_bits = BitVec::new();
    for point in points {
        for i in 0..=8 {
            point_bits.push((point & (1 << (8 - i))) != 0);
        }
    }

    let color_bools: Vec<bool> = placements.iter().map(|p| p.color == Color::Black).collect();
    let mut color_bits = BitVec::new();
    for color in color_bools {
        color_bits.push(color);
    }

    let len = placements.len();

    assert!(
        len <= u16::MAX as usize,
        "Placements length greater than u16::MAX"
    );

    let mut packed = Vec::new();
    packed.push((len >> 8) as u8);
    packed.push(len as u8);

    packed.extend(&point_bits.to_bytes());
    packed.extend(&color_bits.to_bytes());

    packed
}

pub fn pack_captures(captures: &HashMap<usize, Vec<Placement>>) -> Vec<u8> {
    let mut packed = Vec::new();
    let len = captures.len() as u16;
    packed.push((len >> 8) as u8);
    packed.push(len as u8);

    for (move_number, placements) in captures {
        // Pack move number (u16)
        assert!(
            *move_number <= u16::MAX as usize,
            "Move number greater than u16::MAX"
        );
        packed.push((move_number >> 8) as u8);
        packed.push(*move_number as u8);

        // Pack placements
        let packed_placements = pack_placements(placements);
        packed.extend(packed_placements);
    }

    packed
}

pub fn unpack_placements(packed: &[u8]) -> (Vec<Placement>, usize) {
    let len = ((packed[0] as u16) << 8) | (packed[1] as u16);
    let point_bytes_start = 2;
    let point_bytes_end = point_bytes_start + (len as usize * 9).div_ceil(8);
    let color_bytes_start = point_bytes_end;
    let color_bytes_end = color_bytes_start + (len as usize).div_ceil(8);
    let total_bytes = color_bytes_end;

    let point_bits = BitVec::from_bytes(&packed[point_bytes_start..point_bytes_end]);
    let color_bits = BitVec::from_bytes(&packed[color_bytes_start..color_bytes_end]);

    let mut placements = Vec::new();
    for i in 0..len as usize {
        let mut point_value: u16 = 0;
        for j in 0..9 {
            if point_bits[i * 9 + j] {
                point_value |= 1 << (8 - j);
            }
        }

        let x = (point_value / BOARD_SIZE as u16) as u8;
        let y = (point_value % BOARD_SIZE as u16) as u8;
        let color = if color_bits[i] {
            Color::Black
        } else {
            Color::White
        };

        placements.push(Placement {
            point: Point { x, y },
            color,
        });
    }

    (placements, total_bytes)
}

pub fn unpack_captures(packed: &[u8]) -> HashMap<usize, Vec<Placement>> {
    let mut captures = HashMap::new();
    let len = ((packed[0] as u16) << 8) | (packed[1] as u16);
    let mut offset = 2;

    for _ in 0..len {
        // Unpack move number (u16)
        let move_number = ((packed[offset] as usize) << 8) | (packed[offset + 1] as usize);
        offset += 2;

        // Unpack placements
        let (placements, bytes_read) = unpack_placements(&packed[offset..]);
        captures.insert(move_number, placements);
        offset += bytes_read;
    }

    captures
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Rank {
    Kyu(u8),
    Dan(u8),
    Pro(u8),
    Custom(String),
}

impl fmt::Display for Rank {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Rank::Kyu(n) => write!(f, "{n}k"),
            Rank::Dan(n) => write!(f, "{n}d"),
            Rank::Pro(n) => write!(f, "{n}P"),
            Rank::Custom(s) => write!(f, "{s}"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Rules {
    Chinese,
    Japanese,
    Korean,
    Ing,
    Custom(String),
}

pub fn parse_rank(rank_str: &str) -> Rank {
    let rank_str = rank_str.trim();
    if rank_str.is_empty() {
        return Rank::Custom("".to_string());
    }

    // Find the first non-digit character
    let num_end = rank_str.chars().position(|c| !c.is_ascii_digit());
    if let Some(pos) = num_end {
        if let Ok(num) = rank_str[..pos].parse::<u8>() {
            let rest = rank_str[pos..].trim().to_lowercase();
            match rest.as_str() {
                "d" | "dan" => Rank::Dan(num),
                "k" | "kyu" => Rank::Kyu(num),
                "p" | "pro" => Rank::Pro(num),
                _ => Rank::Custom(rank_str.to_string()),
            }
        } else {
            Rank::Custom(rank_str.to_string())
        }
    } else {
        Rank::Custom(rank_str.to_string())
    }
}

pub fn parse_rules(rules_str: &str) -> Rules {
    let rules_str = rules_str.trim().to_lowercase();

    if rules_str.starts_with("chin") || rules_str == "cn" || rules_str == "chn" {
        Rules::Chinese
    } else if rules_str.starts_with("japan") || rules_str == "jp" || rules_str == "jpn" {
        Rules::Japanese
    } else if rules_str.starts_with("korea") || rules_str == "kr" || rules_str == "kor" {
        Rules::Korean
    } else if rules_str.starts_with("ing") {
        Rules::Ing
    } else {
        Rules::Custom(rules_str)
    }
}

pub fn parse_komi(komi_str: &str) -> Option<f32> {
    let komi_str = komi_str.trim();
    if komi_str.is_empty() {
        return None;
    }

    match komi_str.parse::<f32>() {
        Ok(value) if value.is_finite() => Some(value),
        _ => None,
    }
}

fn parse_score_str(score_str: &str) -> Option<Score> {
    let score_str = score_str.trim();

    // Handle empty score
    if score_str.is_empty() {
        return None;
    }

    match score_str {
        "r" | "resign" => Some(Score::Resignation),
        "t" | "time" => Some(Score::Timeout),
        "f" | "forfeit" => Some(Score::Forfeit),
        _ => score_str.parse::<f32>().ok().map(Score::Points),
    }
}

pub fn parse_sgf_result(result_str: &str) -> GameResult {
    // Extract note from brackets if present
    let mut note = "".to_string();
    if let Some(start) = result_str.find('(') {
        if let Some(end) = result_str[start + 1..].find(')') {
            note = result_str[start + 1..start + 1 + end].trim().to_string();
        }
    } else if let Some(start) = result_str.find('{') {
        if let Some(end) = result_str[start + 1..].find('}') {
            note = result_str[start + 1..start + 1 + end].trim().to_string();
        }
    }
    let result_str = result_str
        .find(['(', '{'])
        .map(|pos| &result_str[..pos])
        .unwrap_or(result_str)
        .trim()
        .to_lowercase();

    match result_str.as_str() {
        // Chinese "mid-game" wins
        "黑中盘胜" | "黑中押胜" | "黑棋中盘胜" => {
            GameResult::Player(Color::Black, Some(Score::Resignation), note.clone())
        }
        "白中盘胜" | "白中押胜" | "白棋中盘胜" => {
            GameResult::Player(Color::White, Some(Score::Resignation), note.clone())
        }

        // Chinese simple wins
        "黑胜" => GameResult::Player(Color::Black, None, note.clone()),
        "白胜" => GameResult::Player(Color::White, None, note.clone()),

        // Chinese wins with other unknown characters
        s if s.contains("黑") && s.contains("胜") => {
            GameResult::Player(Color::Black, None, result_str.to_string())
        }
        s if s.contains("白") && s.contains("胜") => {
            GameResult::Player(Color::White, None, result_str.to_string())
        }

        // Draw variations
        "0" | "draw" | "jigo" | "和棋" => GameResult::Draw,

        "打挂" | "打掛" | "game suspended" | "void" => GameResult::Void,

        "不詳" | "?" => GameResult::Unknown(note.clone()),

        // Standard SGF formats
        s if s.starts_with("b+") => {
            let score = parse_score_str(&s[2..]);
            GameResult::Player(Color::Black, score, note.clone())
        }
        s if s.starts_with("w+") => {
            let score = parse_score_str(&s[2..]);
            GameResult::Player(Color::White, score, note.clone())
        }
        // missing plus sign
        s if s.starts_with("b") => {
            let score = parse_score_str(&s[1..]);
            GameResult::Player(Color::Black, score, note.clone())
        }
        s if s.starts_with("w") => {
            let score = parse_score_str(&s[1..]);
            GameResult::Player(Color::White, score, note.clone())
        }
        _ => GameResult::Unknown(result_str.to_string()),
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Player {
    Id(i16, String),
    Unknown(String),
}

#[derive(Clone, Debug, PartialEq)]
pub struct Game {
    pub event: String,
    pub round: String,
    pub location: String,
    pub date: Option<SgfDate>,
    pub player_black: Player,
    pub player_white: Player,
    pub rank_black: Rank,
    pub rank_white: Rank,
    pub komi: Option<f32>,
    pub rules: Option<Rules>,
    pub result: GameResult,
    pub moves: Vec<Placement>,
    pub captures: HashMap<usize, Vec<Placement>>,
}

#[derive(Serialize, Deserialize)]
struct PackedGame {
    name: String,
    event: String,
    round: String,
    location: String,
    date: Option<SgfDate>,
    player_black: Player,
    player_white: Player,
    rank_black: Rank,
    rank_white: Rank,
    komi: Option<f32>,
    rules: Option<Rules>,
    result: GameResult,
    #[serde(with = "serde_bytes")]
    moves: Vec<u8>,
    #[serde(with = "serde_bytes")]
    captures: Vec<u8>,
}

pub fn pack_games(games: &HashMap<String, Game>) -> Vec<u8> {
    let packed_games: Vec<PackedGame> = games
        .iter()
        .map(|(name, game)| PackedGame {
            name: name.clone(),
            event: game.event.clone(),
            round: game.round.clone(),
            location: game.location.clone(),
            date: game.date.clone(),
            player_black: game.player_black.clone(),
            player_white: game.player_white.clone(),
            rank_black: game.rank_black.clone(),
            rank_white: game.rank_white.clone(),
            komi: game.komi,
            rules: game.rules.clone(),
            result: game.result.clone(),
            moves: pack_placements(&game.moves),
            captures: pack_captures(&game.captures),
        })
        .collect();

    let mut buf = Vec::new();
    packed_games
        .serialize(&mut Serializer::new(&mut buf))
        .expect("Failed to serialize games");
    buf
}

pub fn unpack_games(packed: &[u8]) -> HashMap<String, Game> {
    let mut deserializer = Deserializer::new(packed);
    let packed_games: Vec<PackedGame> =
        Vec::<PackedGame>::deserialize(&mut deserializer).expect("Failed to deserialize games");

    packed_games
        .into_iter()
        .map(|packed| {
            (
                packed.name,
                Game {
                    event: packed.event,
                    round: packed.round,
                    location: packed.location,
                    date: packed.date,
                    player_black: packed.player_black,
                    player_white: packed.player_white,
                    rank_black: packed.rank_black,
                    rank_white: packed.rank_white,
                    komi: packed.komi,
                    rules: packed.rules,
                    result: packed.result,
                    moves: unpack_placements(&packed.moves).0,
                    captures: unpack_captures(&packed.captures),
                },
            )
        })
        .collect()
}

pub fn check_within_one_quadrant(position: &[Placement]) -> bool {
    if position.is_empty() {
        return true;
    }

    let mid = BOARD_SIZE / 2;
    let mut quadrant = None;

    for placement in position {
        let x = placement.point.x;
        let y = placement.point.y;

        // Return false if point is on middle lines
        if x == mid || y == mid {
            return false;
        }

        let current_quadrant = match (x < mid, y < mid) {
            (true, true) => 0,   // Top-left
            (false, true) => 1,  // Top-right
            (true, false) => 2,  // Bottom-left
            (false, false) => 3, // Bottom-right
        };

        match quadrant {
            None => quadrant = Some(current_quadrant),
            Some(q) if q != current_quadrant => return false,
            _ => continue,
        }
    }

    true
}

pub fn get_connected_groups(position: &[Placement]) -> Vec<Vec<Placement>> {
    if position.is_empty() {
        return Vec::new();
    }

    let mut groups = Vec::new();
    let mut visited = HashSet::new();

    for placement in position {
        if visited.contains(placement) {
            continue;
        }

        let mut current_group = Vec::new();
        let mut to_visit = Vec::new();
        to_visit.push(*placement);
        visited.insert(*placement);

        while let Some(current) = to_visit.pop() {
            current_group.push(current);

            // Check all four orthogonal directions
            let directions = [
                (0i8, 1i8),  // up
                (0i8, -1i8), // down
                (1i8, 0i8),  // right
                (-1i8, 0i8), // left
            ];

            for (dx, dy) in directions {
                let new_x = current.point.x as i8 + dx;
                let new_y = current.point.y as i8 + dy;

                // Check if the new point is within board bounds
                if new_x < 0 || new_x >= BOARD_SIZE as i8 || new_y < 0 || new_y >= BOARD_SIZE as i8
                {
                    continue;
                }

                let new_point = Point {
                    x: new_x as u8,
                    y: new_y as u8,
                };

                // Look for a stone of the same color at this point
                if let Some(&neighbor) = position
                    .iter()
                    .find(|p| p.point == new_point && p.color == current.color)
                {
                    if !visited.contains(&neighbor) {
                        to_visit.push(neighbor);
                        visited.insert(neighbor);
                    }
                }
            }
        }

        groups.push(current_group);
    }

    groups
}

pub fn get_group_liberties(group: &[Placement], position: &[Placement]) -> Vec<Point> {
    let mut liberties = HashSet::new();

    for placement in group {
        // Check all four orthogonal directions
        let directions = [
            (0i8, 1i8),  // up
            (0i8, -1i8), // down
            (1i8, 0i8),  // right
            (-1i8, 0i8), // left
        ];

        for (dx, dy) in directions {
            let new_x = placement.point.x as i8 + dx;
            let new_y = placement.point.y as i8 + dy;

            // Check if the new point is within board bounds
            if new_x < 0 || new_x >= BOARD_SIZE as i8 || new_y < 0 || new_y >= BOARD_SIZE as i8 {
                continue;
            }

            let new_point = Point {
                x: new_x as u8,
                y: new_y as u8,
            };

            // If there's no stone at this point, it's a liberty
            if !position.iter().any(|p| p.point == new_point) {
                liberties.insert(new_point);
            }
        }
    }

    liberties.into_iter().collect()
}

pub fn get_captured_groups(position: &[Placement]) -> Vec<Vec<Placement>> {
    let groups = get_connected_groups(position);
    groups
        .into_iter()
        .filter(|group| get_group_liberties(group, position).is_empty())
        .collect()
}

pub fn get_captured_stones(position: &[Placement]) -> Vec<Placement> {
    get_captured_groups(position)
        .into_iter()
        .flatten()
        .collect()
}

pub struct GameState {
    pub position: Vec<Placement>,
    pub captures: Vec<Placement>,
    pub number_of_moves: usize,
}

pub fn calculate_position(moves: &[Placement]) -> GameState {
    let mut position = Vec::new();
    let mut captures = Vec::new();

    for &placement in moves {
        position.push(placement);
        let captured = get_captured_stones(&position);
        captures.extend(captured.clone());
        position.retain(|p| !captured.contains(p));
    }

    GameState {
        position,
        captures,
        number_of_moves: moves.len(),
    }
}

const DIRECTIONS: [(i8, i8); 4] = [
    (0i8, 1i8),  // up
    (0i8, -1i8), // down
    (1i8, 0i8),  // right
    (-1i8, 0i8), // left
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Neighbor {
    Stone(Placement),
    Empty(Point),
    Edge,
}

pub fn get_neighbors(point: &Point, position: &[Placement]) -> [Neighbor; 4] {
    let mut result = [Neighbor::Edge; 4];
    for (i, direction) in DIRECTIONS.iter().enumerate() {
        let (dx, dy) = *direction;
        let new_x = point.x as i8 + dx;
        let new_y = point.y as i8 + dy;

        if new_x < 0 || new_x >= BOARD_SIZE as i8 || new_y < 0 || new_y >= BOARD_SIZE as i8 {
            continue;
        }

        let neighbour_point = Point {
            x: new_x as u8,
            y: new_y as u8,
        };

        if let Some(placement) = position.iter().find(|p| p.point == neighbour_point) {
            result[i] = Neighbor::Stone(*placement);
        } else {
            result[i] = Neighbor::Empty(*point);
        }
    }
    result
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GoBoard {
    pub position: Vec<Placement>,
    pub captures: Vec<Vec<Placement>>,
    pub groups: Vec<Vec<Placement>>,
}

impl Default for GoBoard {
    fn default() -> Self {
        Self::new()
    }
}

impl GoBoard {
    pub fn new() -> GoBoard {
        GoBoard {
            position: Vec::new(),
            captures: Vec::new(),
            groups: Vec::new(),
        }
    }

    fn capture_group(&mut self, group: &[Placement]) {
        self.groups.retain(|g| g != group);
        self.captures.push(group.to_vec());
        self.position.retain(|p| !group.contains(p));
    }

    fn get_groups(&self, points: &[Point]) -> HashSet<Vec<Placement>> {
        let mut groups = HashSet::new();
        for point in points {
            let group = self
                .groups
                .iter()
                .find(|g| g.iter().any(|p| p.point == *point))
                .expect("Group not found");
            groups.insert(group.clone());
        }
        groups
    }

    fn out_of_liberties(&self, group: &[Placement]) -> bool {
        for placement in group {
            for (dx, dy) in DIRECTIONS {
                let neighbor_x = placement.point.x as i8 + dx;
                let neighbor_y = placement.point.y as i8 + dy;

                if neighbor_x < 0
                    || neighbor_x >= BOARD_SIZE as i8
                    || neighbor_y < 0
                    || neighbor_y >= BOARD_SIZE as i8
                {
                    continue;
                }

                let neighbor_point = Point {
                    x: neighbor_x as u8,
                    y: neighbor_y as u8,
                };

                // if there is no stone at a neighboring point, it's a liberty
                if !self.position.iter().any(|p| p.point == neighbor_point) {
                    return false;
                }
            }
        }
        true
    }

    pub fn make_move(&mut self, move_: &Placement) -> Vec<Placement> {
        if self.position.iter().any(|p| p.point == move_.point) {
            // bad sgf with duplicate move, we ignore it for now
            return Vec::new();
        }
        self.position.push(*move_);
        let mut same_color = Vec::new();
        let mut other_color = Vec::new();
        for neighbor in get_neighbors(&move_.point, &self.position) {
            if let Neighbor::Stone(Placement { color, point }) = neighbor {
                if color == move_.color {
                    same_color.push(point);
                } else {
                    other_color.push(point);
                }
            }
        }

        let mut captures = Vec::new();

        // check the liberties of opponent's touching groups
        for other_group in self.get_groups(&other_color) {
            if self.out_of_liberties(&other_group) {
                self.capture_group(&other_group);
                captures.extend(other_group);
            }
        }

        // merge touching groups that contain the same color stones as the move
        let mut move_group = self
            .get_groups(&same_color)
            .iter()
            .flatten()
            .cloned()
            .collect::<Vec<Placement>>();

        // remove any groups that were merged
        self.groups
            .retain(|g| !g.iter().any(|p| move_group.contains(p)));

        move_group.push(*move_);

        // suicide move
        if self.out_of_liberties(&move_group) {
            self.capture_group(&move_group);
            captures.extend(move_group);
        } else {
            self.groups.push(move_group);
        }
        captures
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_get_surrounding_points_range1() {
        let point = Point { x: 1, y: 1 };
        let surrounding_points = get_surrounding_points(&point, 1);
        assert_eq!(surrounding_points.len(), 8);
        assert!(surrounding_points.contains(&Point { x: 0, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 0, y: 1 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 2, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 2, y: 1 }));
        assert!(surrounding_points.contains(&Point { x: 0, y: 2 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 2 }));
    }

    #[test]
    fn test_get_surrounding_points_at_corner() {
        let point = Point { x: 0, y: 0 };
        let surrounding_points = get_surrounding_points(&point, 1);
        assert_eq!(surrounding_points.len(), 3);
        assert!(surrounding_points.contains(&Point { x: 0, y: 1 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 1 }));
    }

    #[test]
    fn test_get_surrounding_points_at_other_corner() {
        let point = Point {
            x: BOARD_SIZE - 1,
            y: BOARD_SIZE - 1,
        };
        let surrounding_points = get_surrounding_points(&point, 1);
        assert_eq!(surrounding_points.len(), 3);
        assert!(surrounding_points.contains(&Point {
            x: BOARD_SIZE - 2,
            y: BOARD_SIZE - 1
        }));
        assert!(surrounding_points.contains(&Point {
            x: BOARD_SIZE - 1,
            y: BOARD_SIZE - 2
        }));
        assert!(surrounding_points.contains(&Point {
            x: BOARD_SIZE - 2,
            y: BOARD_SIZE - 2
        }));
    }

    #[test]
    fn test_surrounding_points_range2() {
        let point = Point { x: 3, y: 3 };
        let surrounding_points = get_surrounding_points(&point, 2);
        assert_eq!(surrounding_points.len(), 24);
    }

    #[test]
    fn test_surrounding_points_range2_at_corner() {
        let point = Point { x: 0, y: 0 };
        let surrounding_points = get_surrounding_points(&point, 2);
        assert_eq!(surrounding_points.len(), 8);
    }

    #[test]
    fn test_surrounding_points_range2_1_1_point() {
        let point = Point { x: 1, y: 1 };
        let surrounding_points = get_surrounding_points(&point, 2);
        assert_eq!(surrounding_points.len(), 15);
    }

    #[test]
    fn test_get_mirrored() {
        let position = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 0, y: 0 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 18, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 9, y: 9 },
            },
        ];

        let mirrored = get_mirrored(&position);
        assert_eq!(mirrored.len(), 3);
        assert!(mirrored.contains(&Placement {
            color: Color::Black,
            point: Point { x: 18, y: 0 },
        }));
        assert!(mirrored.contains(&Placement {
            color: Color::White,
            point: Point { x: 0, y: 5 },
        }));
        assert!(mirrored.contains(&Placement {
            color: Color::Black,
            point: Point { x: 9, y: 9 },
        }));
    }

    proptest! {
        #[test]
        fn test_pack_unpack_placements(placements in prop::collection::vec(
            (any::<bool>(), any::<u8>(), any::<u8>()),
            0..500
        ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
            Placement {
                color: if is_black { Color::Black } else { Color::White },
                point: Point {
                    x: x % BOARD_SIZE,
                    y: y % BOARD_SIZE
                }
            }
        }).collect::<Vec<_>>())) {
            let packed = pack_placements(&placements);
            let unpacked = unpack_placements(&packed);
            assert_eq!(placements, unpacked.0);
        }
    }

    proptest! {
        #[test]
        fn test_pack_unpack_games(games in prop::collection::hash_map(
            "[\\p{L}\\p{N}\\p{P}\\p{Zs}]{1,20}", // Unicode letters, numbers, punctuation, spaces
            prop::collection::vec(
                (any::<bool>(), any::<u8>(), any::<u8>()),
                0..100
            ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
                Placement {
                    color: if is_black { Color::Black } else { Color::White },
                    point: Point {
                        x: x % BOARD_SIZE,
                        y: y % BOARD_SIZE
                    }
                }
            }).collect::<Vec<_>>()),
            0..10 // Number of games
        ).prop_map(|v| v.into_iter().map(|(name, moves)| {
            (name, Game {
                event: "Test Event".to_string(),
                round: "Test Round".to_string(),
                location: "Test Place".to_string(),
                date: Some(SgfDate::YearMonthDay(2024, 1, 1)),
                player_black: Player::Id(1, "Black".to_string()),
                player_white: Player::Id(2, "White".to_string()),
                rank_black: Rank::Pro(9),
                rank_white: Rank::Pro(9),
                komi: None,
                rules: None,
                result: parse_sgf_result("B+R"),
                moves,
                captures: HashMap::new()
            })
        }).collect::<HashMap<_, _>>())) {
            let packed = pack_games(&games);
            let unpacked = unpack_games(&packed);
            assert_eq!(games, unpacked);
        }

        #[test]
        fn test_pack_unpack_games_with_empty_games(games in prop::collection::hash_map(
            "[\\p{L}\\p{N}\\p{P}\\p{Zs}]{1,20}",
            prop::collection::vec(
                (any::<bool>(), any::<u8>(), any::<u8>()),
                0..=0 // Empty placements
            ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
                Placement {
                    color: if is_black { Color::Black } else { Color::White },
                    point: Point {
                        x: x % BOARD_SIZE,
                        y: y % BOARD_SIZE
                    }
                }
            }).collect::<Vec<_>>()),
            0..10 // Number of games
        ).prop_map(|v| v.into_iter().map(|(name, moves)| {
            (name, Game {
                event: "Test Event".to_string(),
                round: "Test Round".to_string(),
                location: "Test Place".to_string(),
                date: Some(SgfDate::YearMonthDay(2024, 1, 1)),
                player_black: Player::Id(1, "Black".to_string()),
                player_white: Player::Id(2, "White".to_string()),
                rank_black: Rank::Pro(9),
                rank_white: Rank::Pro(9),
                komi: None,
                rules: None,
                result: parse_sgf_result("B+R"),
                moves,
                captures: HashMap::new()
            })
        }).collect::<HashMap<_, _>>())) {
            let packed = pack_games(&games);
            let unpacked = unpack_games(&packed);
            assert_eq!(games, unpacked);
        }

        #[test]
        fn test_pack_unpack_games_with_single_placement(games in prop::collection::hash_map(
            "[\\p{L}\\p{N}\\p{P}\\p{Zs}]{1,20}",
            prop::collection::vec(
                (any::<bool>(), any::<u8>(), any::<u8>()),
                1..=1 // Exactly one placement per game
            ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
                Placement {
                    color: if is_black { Color::Black } else { Color::White },
                    point: Point {
                        x: x % BOARD_SIZE,
                        y: y % BOARD_SIZE
                    }
                }
            }).collect::<Vec<_>>()),
            0..20 // Number of games
        ).prop_map(|v| v.into_iter().map(|(name, moves)| {
            (name, Game {
                event: "Test Event".to_string(),
                round: "Test Round".to_string(),
                location: "Test Place".to_string(),
                date: Some(SgfDate::YearMonthDay(2024, 1, 1)),
                player_black: Player::Id(1, "Black".to_string()),
                player_white: Player::Id(2, "White".to_string()),
                rank_black: Rank::Pro(9),
                rank_white: Rank::Pro(9),
                komi: None,
                rules: None,
                result: parse_sgf_result("B+R"),
                moves,
                captures: HashMap::new()
            })
        }).collect::<HashMap<_, _>>())) {
            let packed = pack_games(&games);
            let unpacked = unpack_games(&packed);
            assert_eq!(games, unpacked);
        }
    }

    proptest! {
        #[test]
        fn test_get_mirrored_property(position in prop::collection::vec(
            (any::<bool>(), any::<u8>(), any::<u8>()),
            0..100
        ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
            Placement {
                color: if is_black { Color::Black } else { Color::White },
                point: Point {
                    x: x % BOARD_SIZE,
                    y: y % BOARD_SIZE
                }
            }
        }).collect::<Vec<_>>())) {
            let mirrored = get_mirrored(&position);
            let double_mirrored = get_mirrored(&mirrored);
            assert_eq!(position, double_mirrored);
        }
    }

    #[test]
    fn test_check_within_one_quadrant() {
        // Empty position
        assert!(check_within_one_quadrant(&[]));

        // Single placement in top-left quadrant
        assert!(check_within_one_quadrant(&[Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        }]));

        // Multiple placements in top-left quadrant
        assert!(check_within_one_quadrant(&[
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 7, y: 3 },
            }
        ]));

        // Placements in different quadrants
        assert!(!check_within_one_quadrant(&[
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 }, // Top-left
            },
            Placement {
                color: Color::White,
                point: Point { x: 15, y: 15 }, // Bottom-right
            }
        ]));

        // Placements on middle lines
        assert!(!check_within_one_quadrant(&[Placement {
            color: Color::Black,
            point: Point { x: 9, y: 5 }, // On vertical middle line
        }]));
        assert!(!check_within_one_quadrant(&[Placement {
            color: Color::Black,
            point: Point { x: 5, y: 9 }, // On horizontal middle line
        }]));
        assert!(!check_within_one_quadrant(&[Placement {
            color: Color::Black,
            point: Point { x: 9, y: 9 }, // On both middle lines
        }]));
    }

    #[test]
    fn test_get_connected_groups() {
        // Test empty position
        assert!(get_connected_groups(&[]).is_empty());

        // Test single stone
        let single_stone = vec![Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        }];
        let groups = get_connected_groups(&single_stone);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].len(), 1);

        // Test two connected stones
        let connected_stones = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 6 },
            },
        ];
        let groups = get_connected_groups(&connected_stones);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].len(), 2);

        // Test two separate groups
        let separate_groups = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 6 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 10, y: 10 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 10, y: 11 },
            },
        ];
        let groups = get_connected_groups(&separate_groups);
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].len(), 2);
        assert_eq!(groups[1].len(), 2);

        // Test diagonal stones (should be separate groups)
        let diagonal_stones = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 6, y: 6 },
            },
        ];
        let groups = get_connected_groups(&diagonal_stones);
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].len(), 1);
        assert_eq!(groups[1].len(), 1);
    }

    #[test]
    fn test_get_group_liberties() {
        // Test single stone liberties
        let position = vec![Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        }];
        let groups = get_connected_groups(&position);
        let liberties = get_group_liberties(&groups[0], &position);
        assert_eq!(liberties.len(), 4);

        // Test surrounded stone (no liberties)
        let surrounded = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 4 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 6 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 4, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 6, y: 5 },
            },
        ];
        let groups = get_connected_groups(&surrounded);
        let liberties = get_group_liberties(&groups[0], &surrounded);
        assert_eq!(liberties.len(), 0);

        // Test group with shared liberties
        let group_with_shared_liberties = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 6 },
            },
        ];
        let groups = get_connected_groups(&group_with_shared_liberties);
        let liberties = get_group_liberties(&groups[0], &group_with_shared_liberties);
        assert_eq!(liberties.len(), 6); // 2 stones × 4 liberties - 2 shared liberties
    }

    #[test]
    fn test_get_captured_groups() {
        // Test no captures
        let position = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 10, y: 10 },
            },
        ];
        let captured = get_captured_groups(&position);
        assert!(captured.is_empty());

        // Test captured group
        let position_with_capture = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 4 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 6 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 4, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 6, y: 5 },
            },
        ];
        let captured = get_captured_groups(&position_with_capture);
        assert_eq!(captured.len(), 1);
        assert_eq!(captured[0].len(), 1);
        assert_eq!(captured[0][0].color, Color::Black);

        // Test multiple captured groups
        let multiple_captures = vec![
            // First captured group
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 4 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 6 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 4, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 6, y: 5 },
            },
            // Second captured group
            Placement {
                color: Color::Black,
                point: Point { x: 15, y: 15 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 15, y: 14 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 15, y: 16 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 14, y: 15 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 16, y: 15 },
            },
        ];
        let captured = get_captured_groups(&multiple_captures);
        assert_eq!(captured.len(), 2);
        assert_eq!(captured[0].len(), 1);
        assert_eq!(captured[1].len(), 1);
        assert_eq!(captured[0][0].color, Color::Black);
        assert_eq!(captured[1][0].color, Color::Black);
    }

    #[test]
    fn test_calculate_position() {
        // Test empty game
        let empty_game = vec![];
        let state = calculate_position(&empty_game);
        assert!(state.position.is_empty());
        assert!(state.captures.is_empty());
        assert_eq!(state.number_of_moves, 0);

        // Test simple capture sequence
        let capture_sequence = vec![
            // Black plays at 5,5
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            // White surrounds from below
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 4 },
            },
            // Black plays elsewhere
            Placement {
                color: Color::Black,
                point: Point { x: 10, y: 10 },
            },
            // White completes the surround, capturing black
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 6 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 4, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 6, y: 5 },
            },
        ];

        let state = calculate_position(&capture_sequence);

        // Check final state
        assert_eq!(state.position.len(), 5); // 5 white stones
        assert_eq!(state.captures.len(), 1); // 1 black stone captured
        assert_eq!(state.captures[0].color, Color::Black);
        assert_eq!(state.captures[0].point, Point { x: 5, y: 5 });
        assert_eq!(state.number_of_moves, 6);

        // Test multiple captures
        let multiple_captures = vec![
            // Black plays two stones
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 15, y: 15 },
            },
            // White surrounds both
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 4 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 5, y: 6 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 4, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 6, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 15, y: 14 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 15, y: 16 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 14, y: 15 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 16, y: 15 },
            },
        ];

        let state = calculate_position(&multiple_captures);

        // Check final state
        assert_eq!(state.position.len(), 8); // 8 white stones
        assert_eq!(state.captures.len(), 2); // 2 black stones captured
        assert!(state.captures.iter().all(|p| p.color == Color::Black));
        assert_eq!(state.number_of_moves, 10);
    }

    #[test]
    fn test_goboard_new() {
        let board = GoBoard::new();
        assert!(board.position.is_empty());
        assert!(board.captures.is_empty());
        assert!(board.groups.is_empty());
    }

    #[test]
    fn test_goboard_single_move() {
        let mut board = GoBoard::new();
        let move_ = Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        };
        board.make_move(&move_);
        assert_eq!(board.position.len(), 1, "Position should have 1 stone");
        assert_eq!(board.groups.len(), 1, "Groups should have 1 group");
        assert_eq!(board.groups[0].len(), 1, "Group should have 1 stone");
        assert_eq!(board.groups[0][0], move_, "Group should contain the move");
    }

    #[test]
    fn test_goboard_connected_group() {
        let mut board = GoBoard::new();
        let move1 = Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        };
        let move2 = Placement {
            color: Color::Black,
            point: Point { x: 5, y: 6 },
        };
        board.make_move(&move1);
        board.make_move(&move2);
        assert_eq!(board.position.len(), 2);
        assert_eq!(board.groups.len(), 1);
        assert_eq!(board.groups[0].len(), 2);
        assert!(board.groups[0].contains(&move1));
        assert!(board.groups[0].contains(&move2));
    }

    #[test]
    fn test_goboard_capture() {
        let mut board = GoBoard::new();
        // Place a white stone
        board.make_move(&Placement {
            color: Color::White,
            point: Point { x: 5, y: 5 },
        });
        // Surround it with black stones
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 4 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 6 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 4, y: 5 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 6, y: 5 },
        });
        // White stone should be captured
        assert_eq!(board.position.len(), 4);
        assert_eq!(board.captures.len(), 1);
        assert_eq!(board.captures[0].len(), 1);
        assert_eq!(board.captures[0][0].color, Color::White);
        assert_eq!(board.captures[0][0].point, Point { x: 5, y: 5 });
    }

    #[test]
    fn test_goboard_suicide_move() {
        let mut board = GoBoard::new();
        // Place surrounding stones
        board.make_move(&Placement {
            color: Color::White,
            point: Point { x: 5, y: 4 },
        });
        board.make_move(&Placement {
            color: Color::White,
            point: Point { x: 5, y: 6 },
        });
        board.make_move(&Placement {
            color: Color::White,
            point: Point { x: 4, y: 5 },
        });
        board.make_move(&Placement {
            color: Color::White,
            point: Point { x: 6, y: 5 },
        });
        // Try to place a black stone in the middle (suicide)
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        });
        // Black stone should be captured immediately
        assert_eq!(board.position.len(), 4);
        assert_eq!(board.captures.len(), 1);
        assert_eq!(board.captures[0].len(), 1);
        assert_eq!(board.captures[0][0].color, Color::Black);
        assert_eq!(board.captures[0][0].point, Point { x: 5, y: 5 });
    }

    #[test]
    fn test_goboard_multiple_groups() {
        let mut board = GoBoard::new();
        // Create two separate black groups
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 6 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 15, y: 15 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 15, y: 16 },
        });
        assert_eq!(board.position.len(), 4);
        assert_eq!(board.groups.len(), 2);
        assert_eq!(board.groups[0].len(), 2);
        assert_eq!(board.groups[1].len(), 2);
    }

    #[test]
    fn test_goboard_merge_groups() {
        let mut board = GoBoard::new();
        // Create two black groups
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 5, y: 6 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 7, y: 5 },
        });
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 7, y: 6 },
        });
        // Connect the groups
        board.make_move(&Placement {
            color: Color::Black,
            point: Point { x: 6, y: 5 },
        });
        // Groups should be merged
        assert_eq!(board.position.len(), 5);
        assert_eq!(board.groups.len(), 1);
        assert_eq!(board.groups[0].len(), 5);
    }

    #[test]
    fn test_parse_rank() {
        // Test empty string
        assert_eq!(parse_rank(""), Rank::Custom("".to_string()));
        assert_eq!(parse_rank("   "), Rank::Custom("".to_string()));

        // Test dan ranks
        assert_eq!(parse_rank("1d"), Rank::Dan(1));
        assert_eq!(parse_rank("1dan"), Rank::Dan(1));
        assert_eq!(parse_rank("1 d"), Rank::Dan(1));
        assert_eq!(parse_rank("1 dan"), Rank::Dan(1));
        assert_eq!(parse_rank("1 Dan"), Rank::Dan(1));
        assert_eq!(parse_rank("  1d  "), Rank::Dan(1));
        assert_eq!(parse_rank("9d"), Rank::Dan(9));
        assert_eq!(parse_rank("9dan"), Rank::Dan(9));

        // Test kyu ranks
        assert_eq!(parse_rank("1k"), Rank::Kyu(1));
        assert_eq!(parse_rank("1kyu"), Rank::Kyu(1));
        assert_eq!(parse_rank("1 k"), Rank::Kyu(1));
        assert_eq!(parse_rank("1 kyu"), Rank::Kyu(1));
        assert_eq!(parse_rank("1 Kyu"), Rank::Kyu(1));
        assert_eq!(parse_rank("  1k  "), Rank::Kyu(1));
        assert_eq!(parse_rank("30k"), Rank::Kyu(30));
        assert_eq!(parse_rank("30kyu"), Rank::Kyu(30));

        // Test pro ranks
        assert_eq!(parse_rank("1p"), Rank::Pro(1));
        assert_eq!(parse_rank("1pro"), Rank::Pro(1));
        assert_eq!(parse_rank("1 p"), Rank::Pro(1));
        assert_eq!(parse_rank("1 pro"), Rank::Pro(1));
        assert_eq!(parse_rank("1 Pro"), Rank::Pro(1));
        assert_eq!(parse_rank("  1p  "), Rank::Pro(1));
        assert_eq!(parse_rank("9p"), Rank::Pro(9));
        assert_eq!(parse_rank("9pro"), Rank::Pro(9));

        // Test invalid formats
        assert_eq!(parse_rank("invalid"), Rank::Custom("invalid".to_string()));
        assert_eq!(parse_rank("1"), Rank::Custom("1".to_string()));
        assert_eq!(parse_rank("d"), Rank::Custom("d".to_string()));
        assert_eq!(parse_rank("1invalid"), Rank::Custom("1invalid".to_string()));
        assert_eq!(
            parse_rank("1 invalid"),
            Rank::Custom("1 invalid".to_string())
        );
        assert_eq!(parse_rank("1d1"), Rank::Custom("1d1".to_string()));
        assert_eq!(parse_rank("1d1d"), Rank::Custom("1d1d".to_string()));
    }

    #[test]
    fn test_parse_rules() {
        // Test Chinese variations
        assert_eq!(parse_rules("Chinese"), Rules::Chinese);
        assert_eq!(parse_rules("chinese"), Rules::Chinese);
        assert_eq!(parse_rules("CHINESE"), Rules::Chinese);
        assert_eq!(parse_rules(" Chinese "), Rules::Chinese);
        assert_eq!(parse_rules("China"), Rules::Chinese);
        assert_eq!(parse_rules("china"), Rules::Chinese);
        assert_eq!(parse_rules("Chinese Rules"), Rules::Chinese);
        assert_eq!(parse_rules("CN"), Rules::Chinese);
        assert_eq!(parse_rules("cn"), Rules::Chinese);
        assert_eq!(parse_rules("CHN"), Rules::Chinese);
        assert_eq!(parse_rules("chn"), Rules::Chinese);

        // Test Japanese variations
        assert_eq!(parse_rules("Japanese"), Rules::Japanese);
        assert_eq!(parse_rules("japanese"), Rules::Japanese);
        assert_eq!(parse_rules("JAPANESE"), Rules::Japanese);
        assert_eq!(parse_rules(" Japanese "), Rules::Japanese);
        assert_eq!(parse_rules("Japan"), Rules::Japanese);
        assert_eq!(parse_rules("japan"), Rules::Japanese);
        assert_eq!(parse_rules("Japanese Rules"), Rules::Japanese);
        assert_eq!(parse_rules("JP"), Rules::Japanese);
        assert_eq!(parse_rules("jp"), Rules::Japanese);
        assert_eq!(parse_rules("JPN"), Rules::Japanese);
        assert_eq!(parse_rules("jpn"), Rules::Japanese);

        // Test Korean variations
        assert_eq!(parse_rules("Korean"), Rules::Korean);
        assert_eq!(parse_rules("korean"), Rules::Korean);
        assert_eq!(parse_rules("KOREAN"), Rules::Korean);
        assert_eq!(parse_rules(" Korean "), Rules::Korean);
        assert_eq!(parse_rules("Korea"), Rules::Korean);
        assert_eq!(parse_rules("korea"), Rules::Korean);
        assert_eq!(parse_rules("Korean Rules"), Rules::Korean);
        assert_eq!(parse_rules("KR"), Rules::Korean);
        assert_eq!(parse_rules("kr"), Rules::Korean);
        assert_eq!(parse_rules("KOR"), Rules::Korean);
        assert_eq!(parse_rules("kor"), Rules::Korean);

        // Test Ing variations
        assert_eq!(parse_rules("Ing"), Rules::Ing);
        assert_eq!(parse_rules("ing"), Rules::Ing);
        assert_eq!(parse_rules("ING"), Rules::Ing);
        assert_eq!(parse_rules(" Ing "), Rules::Ing);
        assert_eq!(parse_rules("Ing Goe"), Rules::Ing);
        assert_eq!(parse_rules("ing goe"), Rules::Ing);
        assert_eq!(parse_rules("Ing GOE"), Rules::Ing);
        assert_eq!(parse_rules("Ing Goe Rules"), Rules::Ing);
        assert_eq!(parse_rules("ing goe rules"), Rules::Ing);
        assert_eq!(parse_rules("Ing Rules"), Rules::Ing);
        assert_eq!(parse_rules("ing rules"), Rules::Ing);

        // Test custom rules
        assert_eq!(parse_rules("AGA"), Rules::Custom("aga".to_string()));
        assert_eq!(
            parse_rules("Old Chinese"),
            Rules::Custom("old chinese".to_string())
        );
        assert_eq!(parse_rules("Pair go"), Rules::Custom("pair go".to_string()));
        assert_eq!(parse_rules("GOE"), Rules::Custom("goe".to_string()));
        assert_eq!(
            parse_rules("Uchikomi"),
            Rules::Custom("uchikomi".to_string())
        );
        assert_eq!(parse_rules("Unknown"), Rules::Custom("unknown".to_string()));
        assert_eq!(parse_rules(""), Rules::Custom("".to_string()));
        assert_eq!(parse_rules("  "), Rules::Custom("".to_string()));
    }

    #[test]
    fn test_parse_sgf_result() {
        // Test Chinese result formats
        assert_eq!(
            parse_sgf_result("黑中盘胜"),
            GameResult::Player(Color::Black, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("黑中押胜"),
            GameResult::Player(Color::Black, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("白中盘胜"),
            GameResult::Player(Color::White, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("白中押胜"),
            GameResult::Player(Color::White, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("黑胜"),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("白胜"),
            GameResult::Player(Color::White, None, "".to_string())
        );

        // Test simple B/W wins
        assert_eq!(
            parse_sgf_result("B"),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W"),
            GameResult::Player(Color::White, None, "".to_string())
        );

        // Test draw variations
        assert_eq!(parse_sgf_result("和棋"), GameResult::Draw);

        // Test suspended games
        assert_eq!(parse_sgf_result("打挂"), GameResult::Void);
        assert_eq!(parse_sgf_result("打掛"), GameResult::Void);
        assert_eq!(parse_sgf_result("Game suspended"), GameResult::Void);

        // Test unknown/not recorded
        assert_eq!(
            parse_sgf_result("不詳"),
            GameResult::Unknown("".to_string())
        );

        // Test draws
        assert_eq!(parse_sgf_result("0"), GameResult::Draw);
        assert_eq!(parse_sgf_result("Draw"), GameResult::Draw);
        assert_eq!(parse_sgf_result(" 0 "), GameResult::Draw);
        assert_eq!(parse_sgf_result(" Draw "), GameResult::Draw);

        // Test void results
        assert_eq!(parse_sgf_result("?"), GameResult::Unknown("".to_string()));
        assert_eq!(parse_sgf_result("Void"), GameResult::Void);
        assert_eq!(parse_sgf_result(" void "), GameResult::Void);
        assert_eq!(parse_sgf_result("VOID"), GameResult::Void);

        // Test black wins
        assert_eq!(
            parse_sgf_result("B+0.5"),
            GameResult::Player(Color::Black, Some(Score::Points(0.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+0.5"),
            GameResult::Player(Color::Black, Some(Score::Points(0.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+64"),
            GameResult::Player(Color::Black, Some(Score::Points(64.0)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+64"),
            GameResult::Player(Color::Black, Some(Score::Points(64.0)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+12.5"),
            GameResult::Player(Color::Black, Some(Score::Points(12.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+12.5"),
            GameResult::Player(Color::Black, Some(Score::Points(12.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+R"),
            GameResult::Player(Color::Black, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+r"),
            GameResult::Player(Color::Black, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+Resign"),
            GameResult::Player(Color::Black, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+resign"),
            GameResult::Player(Color::Black, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+T"),
            GameResult::Player(Color::Black, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+t"),
            GameResult::Player(Color::Black, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+Time"),
            GameResult::Player(Color::Black, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+time"),
            GameResult::Player(Color::Black, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+F"),
            GameResult::Player(Color::Black, Some(Score::Forfeit), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+f"),
            GameResult::Player(Color::Black, Some(Score::Forfeit), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+Forfeit"),
            GameResult::Player(Color::Black, Some(Score::Forfeit), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+forfeit"),
            GameResult::Player(Color::Black, Some(Score::Forfeit), "".to_string())
        );

        // Test white wins
        assert_eq!(
            parse_sgf_result("W+0.5"),
            GameResult::Player(Color::White, Some(Score::Points(0.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+0.5"),
            GameResult::Player(Color::White, Some(Score::Points(0.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+64"),
            GameResult::Player(Color::White, Some(Score::Points(64.0)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+64"),
            GameResult::Player(Color::White, Some(Score::Points(64.0)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+12.5"),
            GameResult::Player(Color::White, Some(Score::Points(12.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+12.5"),
            GameResult::Player(Color::White, Some(Score::Points(12.5)), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+R"),
            GameResult::Player(Color::White, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+r"),
            GameResult::Player(Color::White, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+Resign"),
            GameResult::Player(Color::White, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+resign"),
            GameResult::Player(Color::White, Some(Score::Resignation), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+T"),
            GameResult::Player(Color::White, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+t"),
            GameResult::Player(Color::White, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+Time"),
            GameResult::Player(Color::White, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+time"),
            GameResult::Player(Color::White, Some(Score::Timeout), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+F"),
            GameResult::Player(Color::White, Some(Score::Forfeit), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+f"),
            GameResult::Player(Color::White, Some(Score::Forfeit), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+Forfeit"),
            GameResult::Player(Color::White, Some(Score::Forfeit), "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+forfeit"),
            GameResult::Player(Color::White, Some(Score::Forfeit), "".to_string())
        );

        // Test results with parentheses and curly braces
        assert_eq!(
            parse_sgf_result("W+2 {moves beyond 111 not known}"),
            GameResult::Player(
                Color::White,
                Some(Score::Points(2.0)),
                "moves beyond 111 not known".to_string()
            )
        );
        assert_eq!(
            parse_sgf_result("B+8 (moves after 208 not recorded)"),
            GameResult::Player(
                Color::Black,
                Some(Score::Points(8.0)),
                "moves after 208 not recorded".to_string()
            )
        );
        assert_eq!(
            parse_sgf_result("Jigo (moves after 127 not recorded)"),
            GameResult::Draw
        );
        assert_eq!(
            parse_sgf_result("B+R (resignation after 150 moves)"),
            GameResult::Player(
                Color::Black,
                Some(Score::Resignation),
                "resignation after 150 moves".to_string()
            )
        );
        assert_eq!(
            parse_sgf_result("W+T {timeout in endgame}"),
            GameResult::Player(
                Color::White,
                Some(Score::Timeout),
                "timeout in endgame".to_string()
            )
        );
        assert_eq!(
            parse_sgf_result("Draw (game ended in jigo)"),
            GameResult::Draw
        );
        assert_eq!(parse_sgf_result("0 (no winner declared)"), GameResult::Draw);

        // Test special cases
        assert_eq!(parse_sgf_result("Void"), GameResult::Void);
        assert_eq!(parse_sgf_result("?"), GameResult::Unknown("".to_string()));
        assert_eq!(
            parse_sgf_result("invalid"),
            GameResult::Unknown("invalid".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+invalid"),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+invalid"),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+invalid"),
            GameResult::Player(Color::White, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+invalid"),
            GameResult::Player(Color::White, None, "".to_string())
        );

        // Test optional scores (just "B+" or "W+" with no score)
        assert_eq!(
            parse_sgf_result("B+"),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("b+"),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("W+"),
            GameResult::Player(Color::White, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("w+"),
            GameResult::Player(Color::White, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result("B+ "),
            GameResult::Player(Color::Black, None, "".to_string())
        );
        assert_eq!(
            parse_sgf_result(" W+ "),
            GameResult::Player(Color::White, None, "".to_string())
        );
    }

    #[test]
    fn test_parse_komi() {
        // Test standard komi values
        assert_eq!(parse_komi("6.5"), Some(6.5));
        assert_eq!(parse_komi("7.5"), Some(7.5));
        assert_eq!(parse_komi("0.5"), Some(0.5));
        assert_eq!(parse_komi("5.5"), Some(5.5));

        // Test integer komi values
        assert_eq!(parse_komi("6"), Some(6.0));
        assert_eq!(parse_komi("7"), Some(7.0));
        assert_eq!(parse_komi("0"), Some(0.0));

        // Test negative komi (reverse komi)
        assert_eq!(parse_komi("-0.5"), Some(-0.5));
        assert_eq!(parse_komi("-6.5"), Some(-6.5));

        // Test with whitespace
        assert_eq!(parse_komi(" 6.5 "), Some(6.5));
        assert_eq!(parse_komi("  7.5  "), Some(7.5));
        assert_eq!(parse_komi("\t0.5\t"), Some(0.5));

        // Test larger values
        assert_eq!(parse_komi("10.5"), Some(10.5));
        assert_eq!(parse_komi("100"), Some(100.0));

        // Test decimal precision
        assert_eq!(parse_komi("6.25"), Some(6.25));
        assert_eq!(parse_komi("7.75"), Some(7.75));

        // Test invalid inputs
        assert_eq!(parse_komi(""), None);
        assert_eq!(parse_komi("   "), None);
        assert_eq!(parse_komi("invalid"), None);
        assert_eq!(parse_komi("6.5.5"), None);
        assert_eq!(parse_komi("6.5x"), None);
        assert_eq!(parse_komi("x6.5"), None);
        assert_eq!(parse_komi("6,5"), None); // Wrong decimal separator
        assert_eq!(parse_komi("six point five"), None);
        assert_eq!(parse_komi("NaN"), None);
        assert_eq!(parse_komi("inf"), None);
        assert_eq!(parse_komi("-inf"), None);
    }
}
