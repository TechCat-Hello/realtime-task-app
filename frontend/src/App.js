import { useEffect, useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  IconButton,
  Paper,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  /* =========================
     初回ロード
  ========================= */
  useEffect(() => {
    axios
      .get("http://localhost:8000/api/tasks/")
      .then((res) => setTasks(res.data))
      .catch(console.error);
  }, []);

  /* =========================
     WebSocket（最重要）
  ========================= */
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/tasks/");

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "task_update") {
        setTasks((prev) => {
          const exists = prev.find((t) => t.id === data.task.id);
          return exists
            ? prev.map((t) => (t.id === data.task.id ? data.task : t))
            : [...prev, data.task];
        });
      }

      if (data.type === "task_delete") {
        setTasks((prev) => prev.filter((t) => t.id !== data.task_id));
      }

      // ✅ 並び替えは必ずこれで反映
      if (data.type === "task_bulk_update") {
        setTasks(data.tasks);
      }
    };

    return () => ws.close();
  }, []);

  /* =========================
     追加
  ========================= */
  const handleAddTask = () => {
    if (!newTask) return;

    const order = tasks.filter((t) => t.status === "todo").length;

    axios.post("http://localhost:8000/api/tasks/", {
      title: newTask,
      status: "todo",
      order,
    });

    setNewTask("");
  };

  const deleteTask = (id) => {
    axios.delete(`http://localhost:8000/api/tasks/${id}/`);
  };

  /* =========================
     DnD（★ここが最大の修正点）
  ========================= */
  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const taskId = Number(draggableId);

    // ❌ setTasks しない！
    // ❌ 並び替えロジックを書かない！

    axios.post("http://localhost:8000/api/tasks/reorder/", {
      task_id: taskId,
      status: destination.droppableId,
      order: destination.index,
    });
  };

  /* =========================
     表示
  ========================= */
  const getStatusDisplay = (status) => {
    if (status === "todo")
      return (
        <Stack direction="row" spacing={0.5}>
          <RadioButtonUncheckedIcon fontSize="small" />
          <Typography>To Do</Typography>
        </Stack>
      );
    if (status === "in_progress")
      return (
        <Stack direction="row" spacing={0.5}>
          <HourglassBottomIcon fontSize="small" />
          <Typography>In Progress</Typography>
        </Stack>
      );
    if (status === "done")
      return (
        <Stack direction="row" spacing={0.5}>
          <CheckCircleIcon fontSize="small" />
          <Typography>Done</Typography>
        </Stack>
      );
    return null;
  };

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <Typography variant="h4" align="center" gutterBottom>
        Task Board
      </Typography>

      <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="New Task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <Button variant="contained" onClick={handleAddTask}>
            Add
          </Button>
        </Stack>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Stack direction="row" spacing={2}>
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ p: 2, flex: 1, minHeight: 500 }}
                >
                  <Typography align="center" sx={{ mb: 2 }}>
                    {column.title}
                  </Typography>

                  {tasks
                    .filter((t) => t.status === column.id)
                    .sort((a, b) => a.order - b.order)
                    .map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={String(task.id)}
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ mb: 2 }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Stack direction="row" spacing={1}>
                                  {getStatusDisplay(task.status)}
                                  <Typography>{task.title}</Typography>
                                </Stack>
                                <IconButton
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          ))}
        </Stack>
      </DragDropContext>
    </div>
  );
}

export default App;
