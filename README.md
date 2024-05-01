***USE THE app.http FILE TO RUN THE URLS***

-> After getting the files to the local repository run 'npm install' to install all the dependencies.

-> To run the server use 'node app.js'/'nodemon app.js'

-> I have created two tables in the 'tasks.db' database. Those 2 tables are

->TABLE1: name_of_the_table = "Users"

->The colums columns used in "Users" table are id,username,role and password with INTEGER,TEXT,TEXT and TEXT data types

->I have used three different roles in this assignment 'manager','employee' and 'client'

->For testing the functionality of the server use the below credentials

manager_login_details = {
"username":"VikramKumar",
"password":"VikramKumar"
}

employee_login_details = {
"username":"SaiKrishna",
"password":"SaiKrishna"
}

client_login_details = {
"username":"VarunJaitli",
"password":"VarunJaitli"
}

***NOTE:
  1)The "client" can see all the created tasks and a specific task based on the taskId.
  2)The "manager" can see all created tasks,a specific task based on taskId,add new task to the data base,update a task and delete a task also.
  3)The "employee" can see the assigned task,update the assigned task.
  Both "client" and "employee" can't delete any task from the data base***

->TABLE2: name_of_the_table = "Tasks"

->The colums columns used in "Tasks" table are id,title,description,status,assigned_employee_id,created_at and updated_at with INTEGER,TEXT,TEXT,TEXT,INTEGER,DATETIME and DATETIME data types

->id - unique id for each task

->title - Task title

->description - description about task

->I have used two different status values in this assignment "IN PROGRESS" and "TO DO"

->assigned_employee_id - the employee who's working on particular task

->created_at - Task created date and time is available here

->updated_at - If any changes in the data then "updated_at" date and time will change

***USE THE app.http FILE TO RUN THE URLS***


