<?php
include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$query = "SELECT * FROM devices ORDER BY last_seen DESC";
$stmt = $db->prepare($query);
$stmt->execute();

$devices = array();
while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $devices[] = $row;
}

echo json_encode($devices);
?>